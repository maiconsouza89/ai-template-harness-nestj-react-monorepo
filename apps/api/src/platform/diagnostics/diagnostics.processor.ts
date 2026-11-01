import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Counter } from '@opentelemetry/api';
import { type Job, UnrecoverableError, type WorkerOptions } from 'bullmq';
import { loadEnv } from '../config/env.js';
import { describeError } from '../logging/describe-error.js';
import { createWorkerConnection } from '../queue/queue.module.js';
import { AppMetrics } from '../telemetry/app-metrics.js';
import {
  DIAGNOSTICS_QUEUE,
  diagnosticsJobSchema,
} from './diagnostics.queue.js';

/** Erro lançado pelo job `fail`, em toda tentativa. */
export class DiagnosticsJobFailure extends Error {
  override readonly name = 'DiagnosticsJobFailure';

  constructor() {
    super('Falha pedida pelo job de diagnóstico');
  }
}

/**
 * Conexão do worker, com a fila offline ligada, como no worker de `email.send`; o getter adia a
 * leitura de `REDIS_URL` para a criação do worker, depois de a configuração ser validada.
 */
const DIAGNOSTICS_WORKER_OPTIONS: Partial<WorkerOptions> = {
  get connection() {
    return createWorkerConnection(loadEnv());
  },
};

/**
 * Worker da fila `diagnostics` no processo da API: o job `succeed` conclui e o `fail` lança em
 * toda tentativa. Cada processamento soma 1 em `app.diagnostics.jobs.processed`, por `outcome`,
 * pelo `AppMetrics`. O trace e as métricas de fila vêm da plataforma, sem código aqui.
 */
@Processor(DIAGNOSTICS_QUEUE, DIAGNOSTICS_WORKER_OPTIONS)
export class DiagnosticsProcessor extends WorkerHost {
  private readonly logger = new Logger(DiagnosticsProcessor.name);
  private readonly processed: Counter;

  constructor(appMetrics: AppMetrics) {
    super();
    this.processed = appMetrics.createCounter(
      'app.diagnostics.jobs.processed',
      {
        description: 'Jobs de diagnóstico processados, por desfecho pedido',
        unit: '{job}',
      },
    );
  }

  async process(job: Job): Promise<{ outcome: 'succeed' }> {
    const parsed = diagnosticsJobSchema.safeParse(job.data);
    if (!parsed.success) {
      // Dado fora do formato não melhora com nova tentativa.
      throw new UnrecoverableError('Job de diagnóstico com formato inválido');
    }
    const { outcome } = parsed.data;
    this.processed.add(1, { outcome });
    if (outcome === 'fail') {
      throw new DiagnosticsJobFailure();
    }
    return { outcome };
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    if (!job) return;
    this.logger.warn(
      `Job de diagnóstico ${job.id} falhou na tentativa ${job.attemptsMade} de ${job.opts.attempts ?? 1}: ${describeError(error)}`,
    );
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.warn(
      `Worker de ${DIAGNOSTICS_QUEUE} indisponível: ${describeError(error)}`,
    );
  }
}
