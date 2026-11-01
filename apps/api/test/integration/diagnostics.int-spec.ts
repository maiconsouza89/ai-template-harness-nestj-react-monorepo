import type { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DiagnosticsModule } from '../../src/platform/diagnostics/diagnostics.module.js';
import { DIAGNOSTICS_QUEUE } from '../../src/platform/diagnostics/diagnostics.queue.js';
import { createTestApp } from '../create-test-app.js';
import { pointsOf, registerInMemoryMetrics } from '../in-memory-metrics.js';
import { waitForJobState } from '../queue-jobs.js';

/**
 * Fila de diagnóstico de ponta a ponta contra o Valkey do Compose (banco 1 do `.env.test`): sem a
 * flag a rota não existe; com ela, o worker da própria aplicação de teste conclui o job `succeed`
 * e falha o `fail` nas 2 tentativas, e as métricas de fila contam cada tentativa.
 */
describe('Fila de diagnóstico', () => {
  it('sem DIAGNOSTICS_ENABLED a rota responde 404', async () => {
    expect(process.env.DIAGNOSTICS_ENABLED).toBeUndefined();
    const app = await createTestApp();
    try {
      await request(app.getHttpServer())
        .post('/api/diagnostics/jobs')
        .send({ outcome: 'succeed' })
        .expect(404);
    } finally {
      await app.close();
    }
  });

  describe('com DIAGNOSTICS_ENABLED=true', () => {
    let inMemory: ReturnType<typeof registerInMemoryMetrics>;
    let app: INestApplication<App>;
    let queue: Queue;

    beforeAll(async () => {
      // Antes da aplicação: o AppMetrics lê o meter na construção.
      inMemory = registerInMemoryMetrics();
      app = await createTestApp(undefined, [
        DiagnosticsModule.register({
          NODE_ENV: 'test',
          DIAGNOSTICS_ENABLED: 'true',
        }),
      ]);
      queue = app.get<Queue>(getQueueToken(DIAGNOSTICS_QUEUE));
      await queue.obliterate({ force: true });
    });

    afterAll(async () => {
      await queue?.obliterate({ force: true });
      await app?.close();
      await inMemory?.shutdown();
    });

    it('conclui o job succeed', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/diagnostics/jobs')
        .send({ outcome: 'succeed' })
        .expect(202);
      const { jobId } = response.body as { jobId: string };
      expect(typeof jobId).toBe('string');

      await waitForJobState(queue, jobId, 'completed');
    });

    it('termina o job fail falho depois de 2 tentativas, contando cada uma', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/diagnostics/jobs')
        .send({ outcome: 'fail' })
        .expect(202);
      const { jobId } = response.body as { jobId: string };

      const job = await waitForJobState(queue, jobId, 'failed');
      expect(job.attemptsMade).toBe(2);

      const collected = await inMemory.collect();
      expect(
        pointsOf(collected, 'app.queue.job.failures').filter(
          (point) => point.attributes.queue === DIAGNOSTICS_QUEUE,
        ),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            attributes: { queue: DIAGNOSTICS_QUEUE, attempt: 1 },
            value: 1,
          }),
          expect.objectContaining({
            attributes: { queue: DIAGNOSTICS_QUEUE, attempt: 2 },
            value: 1,
          }),
        ]),
      );
      expect(
        pointsOf(collected, 'app.queue.jobs').find(
          (point) =>
            point.attributes.queue === DIAGNOSTICS_QUEUE &&
            point.attributes.state === 'failed',
        )?.value,
      ).toBe(1);
      expect(pointsOf(collected, 'app.diagnostics.jobs.processed')).toEqual(
        expect.arrayContaining([
          { scope: 'app', attributes: { outcome: 'succeed' }, value: 1 },
          { scope: 'app', attributes: { outcome: 'fail' }, value: 2 },
        ]),
      );
    });

    it('responde 400 sem enfileirar com outcome desconhecido', async () => {
      const before = await queue.getJobCountByTypes(
        'waiting',
        'active',
        'delayed',
        'completed',
        'failed',
      );
      await request(app.getHttpServer())
        .post('/api/diagnostics/jobs')
        .send({ outcome: 'explodir' })
        .expect(400);
      const after = await queue.getJobCountByTypes(
        'waiting',
        'active',
        'delayed',
        'completed',
        'failed',
      );
      expect(after).toBe(before);
    });
  });
});
