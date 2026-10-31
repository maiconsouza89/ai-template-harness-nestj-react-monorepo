import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import type {
  BatchObservableCallback,
  BatchObservableResult,
  ObservableGauge,
} from '@opentelemetry/api';
import type { Redis } from 'ioredis';
import { withTimeout } from '../async/with-timeout.js';
import { PostgresHealthIndicator } from '../health/postgres-health.indicator.js';
import { ValkeyHealthIndicator } from '../health/valkey-health.indicator.js';
import { describeError } from '../logging/describe-error.js';
import { REDIS } from '../redis/redis.module.js';
import { AppMetrics, METRIC_READ_TIMEOUT_MS } from './app-metrics.js';

/** Memória do Valkey em bytes, como o `INFO memory` informa; `max` é 0 sem `maxmemory`. */
export interface ValkeyMemory {
  used: number;
  max: number;
}

/** Lê `used_memory` e `maxmemory` da resposta do `INFO memory`; lança se faltar algum. */
export function parseInfoMemory(info: string): ValkeyMemory {
  const field = (name: string): number => {
    const match = new RegExp(`^${name}:(\\d+)\\s*$`, 'm').exec(info);
    if (!match) throw new Error(`INFO memory sem ${name}`);
    return Number(match[1]);
  };
  return { used: field('used_memory'), max: field('maxmemory') };
}

interface Gauges {
  memoryUsed: ObservableGauge;
  memoryMax: ObservableGauge;
  health: ObservableGauge;
}

/**
 * Métricas dos componentes (spec da fundação, Métricas exportadas), lidas na coleta do SDK:
 *
 * - `app.valkey.memory.used` e `app.valkey.memory.max` (`By`), do `INFO memory` pela conexão
 *   compartilhada do `RedisModule`;
 * - `app.health.status` (1 de pé, 0 fora, por `dependency`), pelos mesmos indicadores de
 *   `GET /api/health`.
 *
 * Cada leitura tem o limite de `METRIC_READ_TIMEOUT_MS`: a que passa dele sai omitida naquela
 * rodada. Com o Valkey fora, a memória sai omitida com um aviso no log e o indicador dele
 * responde `down`, que vira 0; o resto segue. Inerte sem endpoint, como o `AppMetrics`.
 */
@Injectable()
export class ComponentMetrics
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(ComponentMetrics.name);
  /** Limite de cada leitura; trocado só nos testes. */
  readTimeoutMs = METRIC_READ_TIMEOUT_MS;

  private gauges: Gauges | undefined;
  private readonly collectCallback: BatchObservableCallback = (result) =>
    this.collect(result);

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly postgres: PostgresHealthIndicator,
    private readonly valkey: ValkeyHealthIndicator,
    private readonly appMetrics: AppMetrics,
  ) {}

  onApplicationBootstrap(): void {
    this.gauges = {
      memoryUsed: this.appMetrics.createObservableGauge(
        'app.valkey.memory.used',
        {
          description: 'Memória usada pelo Valkey (used_memory)',
          unit: 'By',
        },
      ),
      memoryMax: this.appMetrics.createObservableGauge(
        'app.valkey.memory.max',
        {
          description: 'Limite de memória do Valkey (maxmemory); 0 sem limite',
          unit: 'By',
        },
      ),
      health: this.appMetrics.createObservableGauge('app.health.status', {
        description: 'Estado da dependência no health check: 1 de pé, 0 fora',
        unit: '1',
      }),
    };
    this.appMetrics.addBatchObservableCallback(
      this.collectCallback,
      Object.values(this.gauges),
    );
  }

  onModuleDestroy(): void {
    if (!this.gauges) return;
    this.appMetrics.removeBatchObservableCallback(
      this.collectCallback,
      Object.values(this.gauges),
    );
    this.gauges = undefined;
  }

  private limited<T>(read: Promise<T>): Promise<T> {
    return withTimeout(
      read,
      this.readTimeoutMs,
      `sem resposta em ${this.readTimeoutMs} ms`,
    );
  }

  private async collect(result: BatchObservableResult): Promise<void> {
    const gauges = this.gauges;
    if (!gauges) return;
    const [memory, postgres, valkey] = await Promise.allSettled([
      this.limited(this.redis.info('memory')).then(parseInfoMemory),
      this.limited(this.postgres.check()),
      this.limited(this.valkey.check()),
    ]);

    if (memory.status === 'fulfilled') {
      result.observe(gauges.memoryUsed, memory.value.used);
      result.observe(gauges.memoryMax, memory.value.max);
    } else {
      const reason: unknown = memory.reason;
      const detail =
        reason instanceof Error &&
        /^(sem resposta|INFO memory)/.test(reason.message)
          ? reason.message
          : describeError(reason);
      this.logger.warn(
        `Memória do Valkey omitida nesta coleta de métricas: ${detail}`,
      );
    }

    for (const [dependency, state] of [
      ['postgres', postgres],
      ['valkey', valkey],
    ] as const) {
      if (state.status === 'fulfilled') {
        result.observe(gauges.health, state.value === 'up' ? 1 : 0, {
          dependency,
        });
      }
    }
  }
}
