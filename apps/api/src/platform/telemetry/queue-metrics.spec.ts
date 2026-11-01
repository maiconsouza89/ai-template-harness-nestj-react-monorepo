import { WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { DiscoveryService } from '@nestjs/core';
import { Queue } from 'bullmq';
import { EventEmitter } from 'node:events';
import {
  pointsOf,
  registerInMemoryMetrics,
} from '../../../test/in-memory-metrics.js';
import { AppMetrics } from './app-metrics.js';
import { QueueMetrics } from './queue-metrics.js';

const NOW = 1_000_000_000_000;

/** `Queue` dublê: passa no `instanceof` da descoberta e responde contagens e pendentes fixos. */
function fakeQueue(
  name: string,
  reading: {
    counts?: Record<string, number>;
    oldestTimestamp?: number;
    error?: Error;
    hang?: boolean;
  },
): Queue {
  const queue = Object.create(Queue.prototype) as Queue;
  const respond = <T>(value: T): Promise<T> =>
    reading.hang
      ? new Promise<T>(() => undefined)
      : reading.error
        ? Promise.reject(reading.error)
        : Promise.resolve(value);
  Object.defineProperty(queue, 'name', { value: name });
  Object.assign(queue, {
    getJobCounts: () => respond(reading.counts ?? {}),
    getJobs: () =>
      respond(
        reading.oldestTimestamp === undefined
          ? []
          : [{ timestamp: reading.oldestTimestamp }],
      ),
  });
  return queue;
}

/** Host de `@Processor` dublê com um worker que é só um emissor de eventos. */
function fakeWorkerHost(queueName: string) {
  const worker = Object.assign(new EventEmitter(), { name: queueName });
  const host = Object.create(WorkerHost.prototype) as WorkerHost;
  Object.assign(host, { _worker: worker });
  return { host, worker };
}

function discoveryOf(...instances: unknown[]): DiscoveryService {
  return {
    getProviders: () => instances.map((instance) => ({ instance })),
  } as unknown as DiscoveryService;
}

describe('QueueMetrics', () => {
  let inMemory: ReturnType<typeof registerInMemoryMetrics>;
  let queueMetrics: QueueMetrics | undefined;
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    inMemory = registerInMemoryMetrics();
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    queueMetrics?.onModuleDestroy();
    queueMetrics = undefined;
    vi.restoreAllMocks();
    await inMemory.shutdown();
  });

  function start(...instances: unknown[]): QueueMetrics {
    queueMetrics = new QueueMetrics(
      discoveryOf(...instances),
      new AppMetrics(),
    );
    queueMetrics.now = () => NOW;
    queueMetrics.onApplicationBootstrap();
    return queueMetrics;
  }

  it('exporta as contagens por estado e a idade do pendente mais antigo em segundos', async () => {
    start(
      fakeQueue('email.send', {
        counts: { waiting: 3, active: 1, delayed: 2, failed: 4 },
        oldestTimestamp: NOW - 42_500,
      }),
    );

    const collected = await inMemory.collect();

    const jobs = pointsOf(collected, 'app.queue.jobs');
    expect(jobs).toHaveLength(4);
    expect(jobs.map((point) => [point.attributes.state, point.value])).toEqual(
      expect.arrayContaining([
        ['waiting', 3],
        ['active', 1],
        ['delayed', 2],
        ['failed', 4],
      ]),
    );
    for (const point of jobs) {
      expect(point.scope).toBe('app');
      expect(point.attributes.queue).toBe('email.send');
    }
    expect(pointsOf(collected, 'app.queue.oldest_job.age')).toEqual([
      { scope: 'app', attributes: { queue: 'email.send' }, value: 42.5 },
    ]);
  });

  it('exporta idade 0 e contagens 0 com a fila vazia', async () => {
    start(fakeQueue('diagnostics', {}));

    const collected = await inMemory.collect();

    expect(
      pointsOf(collected, 'app.queue.jobs').every((point) => point.value === 0),
    ).toBe(true);
    expect(pointsOf(collected, 'app.queue.oldest_job.age')).toEqual([
      { scope: 'app', attributes: { queue: 'diagnostics' }, value: 0 },
    ]);
  });

  it('omite a fila que falha, com um aviso, e segue com as outras', async () => {
    start(
      fakeQueue('quebrada', {
        error: Object.assign(new Error('connect ECONNREFUSED valkey:6379'), {
          code: 'ECONNREFUSED',
        }),
      }),
      fakeQueue('saudavel', { counts: { waiting: 1 }, oldestTimestamp: NOW }),
    );

    const collected = await inMemory.collect();

    const queues = new Set(
      pointsOf(collected, 'app.queue.jobs').map(
        (point) => point.attributes.queue,
      ),
    );
    expect(queues).toEqual(new Set(['saudavel']));
    expect(warn).toHaveBeenCalledTimes(1);
    const [line] = warn.mock.calls[0] as [string];
    expect(line).toContain('quebrada');
    expect(line).toContain('ECONNREFUSED');
    expect(line).not.toContain('valkey:6379');
  });

  it('omite a fila cuja leitura passa do limite', async () => {
    const metrics = start(
      fakeQueue('lenta', { hang: true }),
      fakeQueue('rapida', {}),
    );
    metrics.readTimeoutMs = 20;

    const collected = await inMemory.collect();

    const queues = new Set(
      pointsOf(collected, 'app.queue.oldest_job.age').map(
        (point) => point.attributes.queue,
      ),
    );
    expect(queues).toEqual(new Set(['rapida']));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('lenta'));
  });

  it('conta cada tentativa falha por fila e número da tentativa', async () => {
    const { host, worker } = fakeWorkerHost('diagnostics');
    start(fakeQueue('diagnostics', {}), host);

    worker.emit('failed', { attemptsMade: 1 }, new Error('falhou'));
    worker.emit('failed', { attemptsMade: 2 }, new Error('falhou'));

    const failures = pointsOf(
      await inMemory.collect(),
      'app.queue.job.failures',
    );
    expect(failures).toEqual(
      expect.arrayContaining([
        {
          scope: 'app',
          attributes: { queue: 'diagnostics', attempt: 1 },
          value: 1,
        },
        {
          scope: 'app',
          attributes: { queue: 'diagnostics', attempt: 2 },
          value: 1,
        },
      ]),
    );
    expect(failures).toHaveLength(2);
  });

  it('descobre cada fila uma vez só, mesmo registrada em dois módulos', async () => {
    start(fakeQueue('email.send', {}), fakeQueue('email.send', {}));

    const ages = pointsOf(await inMemory.collect(), 'app.queue.oldest_job.age');
    expect(ages).toHaveLength(1);
  });
});
