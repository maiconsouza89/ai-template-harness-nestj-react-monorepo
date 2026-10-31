import {
  pointsOf,
  registerInMemoryMetrics,
} from '../../../test/in-memory-metrics.js';
import { AppMetrics, assertAppMetricName } from './app-metrics.js';

describe('AppMetrics', () => {
  let inMemory: ReturnType<typeof registerInMemoryMetrics>;

  beforeEach(() => {
    inMemory = registerInMemoryMetrics();
  });

  afterEach(async () => {
    await inMemory.shutdown();
  });

  it('cria as métricas no Meter chamado app', async () => {
    const counter = new AppMetrics().createCounter('app.orders.created', {
      unit: '{order}',
    });
    counter.add(2, { channel: 'web' });

    const [point] = pointsOf(await inMemory.collect(), 'app.orders.created');
    expect(point).toEqual({
      scope: 'app',
      attributes: { channel: 'web' },
      value: 2,
    });
  });

  it('recusa nome fora de app.<domínio>.<medida>', () => {
    const appMetrics = new AppMetrics();
    for (const name of [
      'orders.created',
      'app.orders',
      'app.Orders.created',
      'app.orders-created.total',
      'app..created',
      'app.orders.created.',
    ]) {
      expect(() => appMetrics.createCounter(name)).toThrow(
        /app\.<domínio>\.<medida>/,
      );
      expect(() => appMetrics.createObservableGauge(name)).toThrow();
    }
  });

  it('aceita medida com mais de um segmento e com sublinhado', () => {
    expect(() => assertAppMetricName('app.queue.oldest_job.age')).not.toThrow();
    expect(() =>
      assertAppMetricName('app.diagnostics.jobs.processed'),
    ).not.toThrow();
  });
});
