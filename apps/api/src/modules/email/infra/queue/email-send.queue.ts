import type { JobsOptions } from 'bullmq';
import type { EmailType } from '../../domain/email-request.js';

/** Nome da fila de e-mail no BullMQ (HLD, Interfaces públicas). */
export const EMAIL_SEND_QUEUE = 'email.send';

/**
 * Opções de cada job de `email.send` (ADR-0015; spec do RF-001, Contratos de interface): 5
 * tentativas com backoff exponencial a partir de 5 s; concluídos ficam 24 horas e falhos 7 dias,
 * para inspeção.
 */
export const EMAIL_SEND_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { age: 86_400 },
  removeOnFail: { age: 604_800 },
} as const satisfies JobsOptions;

/**
 * Opções do job `reset-password` (RF-005): as mesmas tentativas e backoff, mas removido assim que
 * conclui e quando falha de vez. O link leva o token em texto puro, que troca a senha durante 1
 * hora; guardado na fila, ele anularia o registro gravado só como hash (spec do RF-005, Modelo de
 * dados). O log do worker continua com o id do job e o da conta para quem investiga a falha.
 */
export const RESET_PASSWORD_JOB_OPTIONS = {
  ...EMAIL_SEND_JOB_OPTIONS,
  removeOnComplete: true,
  removeOnFail: true,
} as const satisfies JobsOptions;

/** Opções do job de `email.send` para cada tipo de e-mail. */
export const EMAIL_SEND_JOB_OPTIONS_BY_TYPE = {
  'verify-email': EMAIL_SEND_JOB_OPTIONS,
  'reset-password': RESET_PASSWORD_JOB_OPTIONS,
} as const satisfies Record<EmailType, JobsOptions>;

/**
 * Tempo máximo para enfileirar. Com o Valkey fora desde a subida, o BullMQ espera a conexão ficar
 * pronta antes de mandar o comando; o limite faz o pedido falhar em vez de segurar quem enfileira.
 */
export const EMAIL_SEND_ENQUEUE_TIMEOUT_MS = 3_000;
