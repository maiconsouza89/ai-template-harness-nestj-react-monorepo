import type { JobsOptions } from 'bullmq';
import { z } from 'zod';

/** Nome da fila de diagnóstico no BullMQ (spec da fundação, Contratos de interface). */
export const DIAGNOSTICS_QUEUE = 'diagnostics';

/**
 * Nome de todo job da fila. Fixo, e não o `outcome`, para o nome do job (que vai nos atributos dos
 * spans do BullMQ) não repetir nada do corpo.
 */
export const DIAGNOSTICS_JOB_NAME = 'run';

/**
 * Opções de cada job: 2 tentativas com backoff fixo de 1 segundo, para o job falho mostrar as duas
 * tentativas em poucos segundos (spec, hipótese), e a retenção da fundação, 24 horas para os
 * concluídos e 7 dias para os falhos.
 */
export const DIAGNOSTICS_JOB_OPTIONS = {
  attempts: 2,
  backoff: { type: 'fixed', delay: 1_000 },
  removeOnComplete: { age: 86_400 },
  removeOnFail: { age: 604_800 },
} as const satisfies JobsOptions;

/** Tempo máximo para enfileirar: com o Valkey fora, a rota responde em vez de segurar o pedido. */
export const DIAGNOSTICS_ENQUEUE_TIMEOUT_MS = 3_000;

/** Corpo de `POST /api/diagnostics/jobs` e dados do job: `succeed` conclui, `fail` lança. */
export const diagnosticsJobSchema = z.strictObject({
  outcome: z.enum(['succeed', 'fail']),
});

export type DiagnosticsJob = z.infer<typeof diagnosticsJobSchema>;
