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
 * Os logs levam só o id do job e o da conta: nada de endereço, nome, link ou mensagem de erro do
 * SMTP, que pode citar o destinatário (ADR-0018).
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

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    if (!job) return;
    const userId = isEmailRequest(job.data) ? job.data.userId : 'desconhecida';
    this.logger.warn(
      `Job ${job.id} da conta ${userId} falhou na tentativa ${job.attemptsMade} de ${job.opts.attempts ?? 1}: ${describeError(error)}`,
    );
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.warn(
      `Worker de ${EMAIL_SEND_QUEUE} indisponível: ${error.message}`,
    );
  }
}
