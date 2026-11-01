import { Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import {
  pointsOf,
  registerInMemoryMetrics,
} from '../../../test/in-memory-metrics.js';
import type { HealthState } from '../health/health-indicator.js';
import type { PostgresHealthIndicator } from '../health/postgres-health.indicator.js';
import type { ValkeyHealthIndicator } from '../health/valkey-health.indicator.js';
import { AppMetrics } from './app-metrics.js';
import { ComponentMetrics, parseInfoMemory } from './component-metrics.js';

/** Trecho do `INFO memory` como o Valkey responde, com CRLF. */
const INFO_MEMORY = [
  '# Memory',
  'used_memory:1048576',
  'used_memory_human:1.00M',
  'maxmemory:0',
  'maxmemory_human:0B',
  'maxmemory_policy:noeviction',
  '',
].join('\r\n');

const never = <T>() => new Promise<T>(() => undefined);

function indicator(check: () => Promise<HealthState>) {
  return { check } as PostgresHealthIndicator & ValkeyHealthIndicator;
}

describe('parseInfoMemory', () => {
  it('lê used_memory e maxmemory sem confundir com os campos _human', () => {
    expect(parseInfoMemory(INFO_MEMORY)).toEqual({ used: 1048576, max: 0 });
  });

  it('lança quando falta o campo', () => {
    expect(() => parseInfoMemory('# Memory\r\n')).toThrow(/used_memory/);
  });
});

describe('ComponentMetrics', () => {
  let inMemory: ReturnType<typeof registerInMemoryMetrics>;
  let componentMetrics: ComponentMetrics | undefined;
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    inMemory = registerInMemoryMetrics();
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    componentMetrics?.onModuleDestroy();
    componentMetrics = undefined;
    vi.restoreAllMocks();
    await inMemory.shutdown();
  });

  function start(options: {
    info: () => Promise<string>;
    postgres?: () => Promise<HealthState>;
    valkey?: () => Promise<HealthState>;
  }): ComponentMetrics {
    componentMetrics = new ComponentMetrics(
      { info: options.info } as unknown as Redis,
      indicator(options.postgres ?? (async () => 'up')),
      indicator(options.valkey ?? (async () => 'up')),
      new AppMetrics(),
    );
    componentMetrics.onApplicationBootstrap();
    return componentMetrics;
  }

  it('transforma o INFO memory nos dois gauges e os indicadores de pé em 1', async () => {
    start({ info: async () => INFO_MEMORY });

    const collected = await inMemory.collect();

    expect(pointsOf(collected, 'app.valkey.memory.used')).toEqual([
      { scope: 'app', attributes: {}, value: 1048576 },
    ]);
    expect(pointsOf(collected, 'app.valkey.memory.max')).toEqual([
      { scope: 'app', attributes: {}, value: 0 },
    ]);
    expect(pointsOf(collected, 'app.health.status')).toEqual(
      expect.arrayContaining([
        { scope: 'app', attributes: { dependency: 'postgres' }, value: 1 },
        { scope: 'app', attributes: { dependency: 'valkey' }, value: 1 },
      ]),
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('com o Valkey fora, omite a memória com um aviso e exporta valkey 0', async () => {
    start({
      info: () =>
        Promise.reject(
          Object.assign(new Error('connect ECONNREFUSED valkey:6379'), {
            code: 'ECONNREFUSED',
          }),
        ),
      valkey: async () => 'down',
    });

    const collected = await inMemory.collect();

    expect(pointsOf(collected, 'app.valkey.memory.used')).toEqual([]);
    expect(pointsOf(collected, 'app.valkey.memory.max')).toEqual([]);
    const health = pointsOf(collected, 'app.health.status');
    expect(health).toEqual(
      expect.arrayContaining([
        { scope: 'app', attributes: { dependency: 'postgres' }, value: 1 },
        { scope: 'app', attributes: { dependency: 'valkey' }, value: 0 },
      ]),
    );
    expect(warn).toHaveBeenCalledTimes(1);
    const [line] = warn.mock.calls[0] as [string];
    expect(line).toContain('ECONNREFUSED');
    expect(line).not.toContain('valkey:6379');
  });

  it('omite a leitura que passa do limite', async () => {
    const metrics = start({ info: never, postgres: never });
    metrics.readTimeoutMs = 20;

    const collected = await inMemory.collect();

    expect(pointsOf(collected, 'app.valkey.memory.used')).toEqual([]);
    expect(pointsOf(collected, 'app.health.status')).toEqual([
      { scope: 'app', attributes: { dependency: 'valkey' }, value: 1 },
    ]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('sem resposta em 20 ms'),
    );
  });
});
