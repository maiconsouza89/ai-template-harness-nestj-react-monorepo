import type { JobsOptions } from 'bullmq';

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
 * Tempo máximo para enfileirar. Com o Valkey fora desde a subida, o BullMQ espera a conexão ficar
 * pronta antes de mandar o comando; o limite faz o pedido falhar em vez de segurar quem enfileira.
 */
export const EMAIL_SEND_ENQUEUE_TIMEOUT_MS = 3_000;
