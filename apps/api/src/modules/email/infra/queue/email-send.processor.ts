import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { type Job, UnrecoverableError } from 'bullmq';
import { PrismaService } from '../../../../platform/prisma/prisma.service.js';
import {
  EMAIL_SEND_QUEUE,
  type EmailJob,
  type EmailKind,
} from '../../email-queue.js';
import {
  renderVerifyEmail,
  type RenderedEmail,
} from '../../templates/verify-email.js';
import { MAIL_TRANSPORT, type MailTransport } from '../smtp/mail-transport.js';

/** O que o worker lê do PostgreSQL: só nome e e-mail do usuário do job. */
export interface EmailRecipientReader {
  user: {
    findUnique(args: {
      where: { id: string };
      select: { name: true; email: true };
    }): Promise<{ name: string; email: string } | null>;
  };
}

/**
 * Falha do SMTP relançada sem a mensagem original, que pode trazer o endereço do destinatário:
 * o BullMQ grava a mensagem do erro no job, no Valkey. Leva só o código do Nodemailer.
 */
export class EmailDeliveryError extends Error {
  override readonly name = 'EmailDeliveryError';

  constructor(readonly code: string) {
    super(`Falha no envio SMTP (${code})`);
  }
}

/** Código do erro do Nodemailer (`ECONNECTION`, `EAUTH`...), ou o nome da classe sem código. */
function errorCode(error: unknown): string {
  if (error && typeof error === 'object') {
    const { code, name } = error as { code?: unknown; name?: unknown };
    if (typeof code === 'string' && code) return code;
    if (typeof name === 'string' && name) return name;
  }
  return 'UNKNOWN';
}

/** Monta o conteúdo da mensagem de cada tipo de job. */
function render(job: EmailJob, recipient: { name: string }): RenderedEmail {
  switch (job.kind) {
    case 'verify-email':
      return renderVerifyEmail({ name: recipient.name, url: job.url });
  }
}

/**
 * Worker da fila `email.send` (Módulo E-mail), no mesmo processo da API (HLD): lê nome e e-mail
 * do usuário do job, monta a mensagem do tipo e envia pelo transporte SMTP. Erro no envio vira
 * nova tentativa pelo BullMQ (5, com backoff exponencial); usuário inexistente falha o job sem
 * nova tentativa (`UnrecoverableError`). O log leva só id do job, tipo e tentativa, nunca o
 * endereço, o nome nem o link, que carrega o token (PRD, Compliance).
 */
@Processor(EMAIL_SEND_QUEUE)
export class EmailSendProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailSendProcessor.name);

  constructor(
    @Inject(PrismaService) private readonly users: EmailRecipientReader,
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
  ) {
    super();
  }

  async process(job: Job<EmailJob>): Promise<void> {
    const meta: { jobId?: string; kind: EmailKind; attempt: number } = {
      jobId: job.id,
      kind: job.data.kind,
      attempt: job.attemptsStarted || job.attemptsMade + 1,
    };

    const recipient = await this.users.user.findUnique({
      where: { id: job.data.userId },
      select: { name: true, email: true },
    });
    if (!recipient) {
      this.logger.warn(
        meta,
        'Usuário do job de e-mail não encontrado; job falho sem nova tentativa',
      );
      throw new UnrecoverableError('Usuário do job de e-mail não encontrado');
    }

    const content = render(job.data, recipient);
    try {
      await this.transport.send({ to: recipient.email, ...content });
    } catch (error) {
      const code = errorCode(error);
      this.logger.warn(
        { ...meta, err: code },
        'Falha no envio do e-mail; o BullMQ tenta de novo até esgotar as tentativas',
      );
      throw new EmailDeliveryError(code);
    }
    this.logger.log(meta, 'E-mail enviado');
  }

  /** Erro de conexão do worker com o Valkey; sem ouvinte, o evento derrubaria o processo. */
  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.warn(`Worker de e-mail sem Valkey: ${error.message}`);
  }
}
