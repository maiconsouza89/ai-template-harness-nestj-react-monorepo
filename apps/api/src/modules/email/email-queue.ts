import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { JobsOptions, Queue } from 'bullmq';

/** Nome da fila de e-mail no BullMQ (HLD, Interfaces públicas, Fila de e-mail). */
export const EMAIL_SEND_QUEUE = 'email.send';

/**
 * Job de confirmação de e-mail do cadastro (RF-001). Leva o id do usuário, não o endereço nem o
 * nome, que o worker lê no PostgreSQL; o link carrega o token e só vai para o e-mail.
 */
export interface VerifyEmailJob {
  kind: 'verify-email';
  userId: string;
  url: string;
}

/** Tipos de e-mail da fila; RF-005 e RF-007 acrescentam os seus aqui. */
export type EmailJob = VerifyEmailJob;
export type EmailKind = EmailJob['kind'];

const HOUR_IN_SECONDS = 60 * 60;

/**
 * Opções de todo job de `email.send` (spec, Contratos de interface): 5 tentativas com backoff
 * exponencial a partir de 5 s; concluídos removidos depois de 24 horas e falhos depois de 7 dias.
 */
export const EMAIL_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { age: 24 * HOUR_IN_SECONDS },
  removeOnFail: { age: 7 * 24 * HOUR_IN_SECONDS },
} as const satisfies JobsOptions;

/**
 * Prazo para o Valkey aceitar o job. A conexão do produtor recusa na hora com o Valkey fora
 * (`enableOfflineQueue` falso), mas o BullMQ espera a primeira conexão ficar pronta antes do
 * primeiro comando; sem prazo, a API que subiu com o Valkey fora seguraria o cadastro.
 */
export const ENQUEUE_TIMEOUT_MS = 3000;

/** Erro de `enqueue` quando o Valkey não aceita o job dentro de `ENQUEUE_TIMEOUT_MS`. */
export class EnqueueTimeoutError extends Error {
  override readonly name = 'EnqueueTimeoutError';

  constructor(timeoutMs: number) {
    super(`A fila ${EMAIL_SEND_QUEUE} não aceitou o job em ${timeoutMs} ms`);
  }
}

/** O que o Módulo Contas usa do Módulo E-mail; o dublê de teste implementa o mesmo contrato. */
export interface EmailQueuePort {
  enqueue(job: EmailJob): Promise<void>;
}

/**
 * Produtor da fila `email.send` (Módulo E-mail): enfileira um job por tipo de e-mail, com as
 * opções de `EMAIL_JOB_OPTIONS`. Falha (Valkey fora, prazo esgotado) é lançada para quem chama
 * decidir; o cadastro só registra (`sign-up/send-verification-email.ts`).
 */
@Injectable()
export class EmailQueue implements EmailQueuePort {
  private readonly logger = new Logger(EmailQueue.name);

  constructor(
    @InjectQueue(EMAIL_SEND_QUEUE) private readonly queue: Queue<EmailJob>,
  ) {
    // Sem ouvinte, o erro de conexão do BullMQ derruba o processo como evento não tratado.
    queue.on('error', (error: Error) =>
      this.logger.warn(`Fila de e-mail indisponível: ${error.message}`),
    );
  }

  async enqueue(job: EmailJob): Promise<void> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new EnqueueTimeoutError(ENQUEUE_TIMEOUT_MS)),
        ENQUEUE_TIMEOUT_MS,
      );
    });
    const add = this.queue.add(job.kind, job, EMAIL_JOB_OPTIONS);
    // A promessa do add segue viva depois do prazo; a rejeição tardia não fica sem tratamento.
    add.catch(() => undefined);
    try {
      await Promise.race([add, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }
}
