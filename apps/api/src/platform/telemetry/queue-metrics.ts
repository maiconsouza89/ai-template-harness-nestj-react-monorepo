import { WorkerHost } from '@nestjs/bullmq';
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import type {
  BatchObservableCallback,
  BatchObservableResult,
  ObservableGauge,
} from '@opentelemetry/api';
import { Queue, type Job, type Worker } from 'bullmq';
import { withTimeout } from '../async/with-timeout.js';
import { describeError } from '../logging/describe-error.js';
import { AppMetrics, METRIC_READ_TIMEOUT_MS } from './app-metrics.js';

/** Estados exportados em `app.queue.jobs` (spec da fundação, Métricas exportadas). */
export const QUEUE_METRIC_STATES = [
  'waiting',
  'active',
  'delayed',
  'failed',
] as const;

type QueueMetricState = (typeof QUEUE_METRIC_STATES)[number];

interface QueueReading {
  counts: Record<QueueMetricState, number>;
  /** Idade em segundos do job em `waiting` mais antigo; 0 sem job pendente. */
  oldestWaitingAgeSeconds: number;
}

/** Contagens por estado e idade do pendente mais antigo de uma fila, em duas leituras do Redis. */
async function readQueue(
  queue: Queue,
  now: () => number,
): Promise<QueueReading> {
  const [counts, [oldest]] = await Promise.all([
    queue.getJobCounts(...QUEUE_METRIC_STATES),
    // Em ordem ascendente o primeiro é o que entrou antes.
    queue.getJobs(['waiting'], 0, 0, true),
  ]);
  const byState = Object.fromEntries(
    QUEUE_METRIC_STATES.map((state) => [state, counts[state] ?? 0]),
  ) as Record<QueueMetricState, number>;
  return {
    counts: byState,
    oldestWaitingAgeSeconds: oldest
      ? Math.max(0, (now() - oldest.timestamp) / 1000)
      : 0,
  };
}

/**
 * Métricas de fila do BullMQ (spec da fundação, Métricas exportadas), sem código por fila: na
 * subida descobre pelo `DiscoveryService` do Nest toda `Queue` registrada com
 * `BullModule.registerQueue`, e todo worker de `@Processor`, de qualquer módulo.
 *
 * - `app.queue.jobs` (`{job}`, por `queue` e `state`) e `app.queue.oldest_job.age` (`s`, por
 *   `queue`) são gauges observáveis lidos do Redis na coleta do SDK, cada fila com o limite de
 *   `METRIC_READ_TIMEOUT_MS`. A fila que falha ou estoura o limite sai omitida naquela rodada,
 *   com um aviso no log, e as outras seguem.
 * - `app.queue.job.failures` (`{failure}`, por `queue` e `attempt`) soma o evento `failed` do
 *   worker de cada fila, que sai a cada tentativa falha, com a tentativa lida de `attemptsMade`.
 *
 * Os atributos são só o nome da fila, o estado e a tentativa: nada dos dados do job. Inerte sem
 * endpoint, como o `AppMetrics`: o meter nulo nunca chama a callback de coleta.
 */
@Injectable()
export class QueueMetrics implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(QueueMetrics.name);
  /** Limite de cada leitura de fila; trocado só nos testes. */
  readTimeoutMs = METRIC_READ_TIMEOUT_MS;
  /** Relógio da idade do pendente; trocado só nos testes. */
  now: () => number = () => Date.now();

  private queues: Queue[] = [];
  private gauges:
    { jobs: ObservableGauge; oldestAge: ObservableGauge } | undefined;
  private readonly detachWorkers: (() => void)[] = [];
  private readonly collectCallback: BatchObservableCallback = (result) =>
    this.collect(result);

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly appMetrics: AppMetrics,
  ) {}

  /** Depois do `onModuleInit` de todos os módulos, quando o `@nestjs/bullmq` já criou os workers. */
  onApplicationBootstrap(): void {
    this.queues = this.discoverQueues();
    const jobs = this.appMetrics.createObservableGauge('app.queue.jobs', {
      description: 'Jobs da fila por estado',
      unit: '{job}',
    });
    const oldestAge = this.appMetrics.createObservableGauge(
      'app.queue.oldest_job.age',
      {
        description: 'Idade do job pendente (waiting) mais antigo da fila',
        unit: 's',
      },
    );
    this.gauges = { jobs, oldestAge };
    this.appMetrics.addBatchObservableCallback(this.collectCallback, [
      jobs,
      oldestAge,
    ]);

    const failures = this.appMetrics.createCounter('app.queue.job.failures', {
      description: 'Tentativas falhas de jobs, por fila e número da tentativa',
      unit: '{failure}',
    });
    for (const worker of this.discoverWorkers()) {
      const onFailed = (job: Job | undefined) => {
        failures.add(1, {
          queue: worker.name,
          attempt: job?.attemptsMade ?? 0,
        });
      };
      worker.on('failed', onFailed);
      this.detachWorkers.push(() => worker.off('failed', onFailed));
    }
  }

  onModuleDestroy(): void {
    if (this.gauges) {
      this.appMetrics.removeBatchObservableCallback(this.collectCallback, [
        this.gauges.jobs,
        this.gauges.oldestAge,
      ]);
      this.gauges = undefined;
    }
    for (const detach of this.detachWorkers.splice(0)) detach();
  }

  private async collect(result: BatchObservableResult): Promise<void> {
    const gauges = this.gauges;
    if (!gauges) return;
    const readings = await Promise.allSettled(
      this.queues.map((queue) =>
        withTimeout(
          readQueue(queue, this.now),
          this.readTimeoutMs,
          `sem resposta em ${this.readTimeoutMs} ms`,
        ),
      ),
    );
    const omitted: string[] = [];
    let reason: unknown;
    readings.forEach((reading, index) => {
      const queue = this.queues[index].name;
      if (reading.status === 'rejected') {
        omitted.push(queue);
        reason ??= reading.reason;
        return;
      }
      for (const state of QUEUE_METRIC_STATES) {
        result.observe(gauges.jobs, reading.value.counts[state], {
          queue,
          state,
        });
      }
      result.observe(gauges.oldestAge, reading.value.oldestWaitingAgeSeconds, {
        queue,
      });
    });
    if (omitted.length > 0) {
      const detail =
        reason instanceof Error && reason.message.startsWith('sem resposta')
          ? reason.message
          : describeError(reason);
      this.logger.warn(
        `Métricas das filas ${omitted.join(', ')} omitidas nesta coleta: ${detail}`,
      );
    }
  }

  /** Uma `Queue` por nome, de qualquer módulo. */
  private discoverQueues(): Queue[] {
    const byName = new Map<string, Queue>();
    for (const wrapper of this.discovery.getProviders()) {
      const instance: unknown = wrapper.instance;
      if (instance instanceof Queue && !byName.has(instance.name)) {
        byName.set(instance.name, instance);
      }
    }
    return [...byName.values()];
  }

  /** Os workers que o `@nestjs/bullmq` criou para os `@Processor` da aplicação. */
  private discoverWorkers(): Worker[] {
    const workers: Worker[] = [];
    for (const wrapper of this.discovery.getProviders()) {
      const instance: unknown = wrapper.instance;
      if (!(instance instanceof WorkerHost)) continue;
      try {
        workers.push(instance.worker);
      } catch {
        // Worker de registro manual ainda não criado: fica sem contador de falhas.
      }
    }
    return workers;
  }
}
