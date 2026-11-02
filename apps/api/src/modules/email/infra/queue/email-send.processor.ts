import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { type Job, UnrecoverableError, type WorkerOptions } from 'bullmq';
import { loadEnv } from '../../../../platform/config/env.js';
import { describeError } from '../../../../platform/logging/describe-error.js';
import { createWorkerConnection } from '../../../../platform/queue/queue.module.js';
import { isEmailRequest } from '../../domain/email-request.js';
import {
  SendEmailUseCase,
  type SendEmailResult,
} from '../../application/send-email/send-email.use-case.js';
import { EMAIL_SEND_QUEUE } from './email-send.queue.js';

/**
 * Opções do worker de `email.send`: a conexão do worker, com a fila offline ligada, no lugar da
 * do produtor que a fila registrada traz (o `@nestjs/bullmq` espalha estas opções sobre as da
 * fila; o prefixo continua vindo da fila). O getter adia a leitura de `REDIS_URL` para quando o
 * worker é criado, no `onModuleInit`, depois de a configuração ser validada; o decorator roda na
 * importação do arquivo.
 */
const EMAIL_SEND_WORKER_OPTIONS: Partial<WorkerOptions> = {
  get connection() {
    return createWorkerConnection(loadEnv());
  },
};

/**
 * Worker de `email.send` no mesmo processo da API (ADR-0015). Cada job vira uma chamada ao caso de
 * uso de envio; falha do transporte rejeita e o BullMQ tenta de novo com o backoff do job.
 * Quando o job conclui ou falha de vez, o worker regrava os dados só com o tipo e o id da conta: o
 * link leva o token em texto puro e não fica guardado na fila durante a retenção (spec do RF-001,
 * sigilo do link na fila). Enquanto o job espera nova tentativa, o link fica, porque o envio
 * precisa dele. Os logs levam só o id do job e o da conta: nada de endereço, nome, link ou mensagem
 * de erro do SMTP, que pode citar o destinatário (ADR-0018).
 */
@Processor(EMAIL_SEND_QUEUE, EMAIL_SEND_WORKER_OPTIONS)
export class EmailSendProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailSendProcessor.name);

  constructor(private readonly sendEmail: SendEmailUseCase) {
    super();
  }

  async process(job: Job): Promise<SendEmailResult> {
    if (!isEmailRequest(job.data)) {
      // Dado fora do formato não melhora com nova tentativa.
      throw new UnrecoverableError('Pedido de e-mail com formato inválido');
    }
    const result = await this.sendEmail.execute(job.data);
    if (result === 'discarded') {
      this.logger.warn(
        `Job ${job.id} descartado: a conta ${job.data.userId} não existe mais`,
      );
    } else if (result === 'already-verified') {
      this.logger.log(
        `Job ${job.id} descartado: a conta ${job.data.userId} já confirmou o e-mail`,
      );
    }
    return result;
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job): Promise<void> {
    await this.dropLink(job);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job | undefined, error: Error): Promise<void> {
    if (!job) return;
    this.logger.warn(
      `Job ${job.id} da conta ${userIdOf(job)} falhou na tentativa ${job.attemptsMade} de ${job.opts.attempts ?? 1}: ${describeError(error)}`,
    );
    if (isFinalFailure(job, error)) await this.dropLink(job);
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.warn(
      `Worker de ${EMAIL_SEND_QUEUE} indisponível: ${describeError(error)}`,
    );
  }

  /**
   * Regrava os dados do job terminado só com o tipo e o id da conta. A falha (worker que cai,
   * Valkey fora) deixa o link nos dados até a retenção vencer, risco aceito na spec do RF-001; ela
   * vai ao log sem o link nem a mensagem do driver.
   */
  private async dropLink(job: Job): Promise<void> {
    try {
      await job.updateData(withoutLink(job.data));
    } catch (error) {
      this.logger.warn(
        `Job ${job.id} da conta ${userIdOf(job)} ficou com o link nos dados: ${describeError(error)}`,
      );
    }
  }
}

/** Os campos do pedido que ficam no job terminado; o resto, link incluído, sai. */
function withoutLink(data: unknown): Record<string, string> {
  const { type, userId } = (
    typeof data === 'object' && data !== null ? data : {}
  ) as Record<string, unknown>;
  return {
    ...(typeof type === 'string' && { type }),
    ...(typeof userId === 'string' && { userId }),
  };
}

/** O id da conta dos dados do job, com ou sem o link (o job terminado já não o tem). */
function userIdOf(job: Job): string {
  const { userId } = (job.data ?? {}) as Record<string, unknown>;
  return typeof userId === 'string' && userId !== '' ? userId : 'desconhecida';
}

/**
 * Falha sem nova tentativa: o `failed` vem depois de o BullMQ contar a tentativa, então esgotar é
 * `attemptsMade` chegar a `attempts`; `UnrecoverableError` falha de vez em qualquer tentativa.
 */
function isFinalFailure(job: Job, error: Error): boolean {
  return (
    error instanceof UnrecoverableError ||
    error.name === 'UnrecoverableError' ||
    job.attemptsMade >= (job.opts.attempts ?? 1)
  );
}
