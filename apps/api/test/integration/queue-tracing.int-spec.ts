import type { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { context, propagation, SpanKind, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  TracerProvider,
} from '@opentelemetry/sdk-trace';
import type { Queue } from 'bullmq';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DiagnosticsModule } from '../../src/platform/diagnostics/diagnostics.module.js';
import { DIAGNOSTICS_QUEUE } from '../../src/platform/diagnostics/diagnostics.queue.js';
import { createTestApp } from '../create-test-app.js';
import { waitForJobState } from '../queue-jobs.js';

/** Espera o exportador receber um span da fila de diagnóstico do tipo `kind`. */
async function waitForSpan(exporter: InMemorySpanExporter, kind: SpanKind) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const found = exporter
      .getFinishedSpans()
      .some(
        (span) =>
          span.kind === kind &&
          span.attributes['bullmq.queue.name'] === DIAGNOSTICS_QUEUE,
      );
    if (found) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/**
 * Propagação do trace pela telemetria do `platform/queue/` (BullMQOtel), com um
 * `InMemorySpanExporter` registrado só neste teste no lugar do OTLP: o span de consumidor da fila
 * de diagnóstico é filho do span de produtor do `add`, no mesmo trace.
 */
describe('Trace das filas', () => {
  const exporter = new InMemorySpanExporter();
  let app: INestApplication<App>;
  let queue: Queue;

  beforeAll(async () => {
    context.setGlobalContextManager(
      new AsyncLocalStorageContextManager().enable(),
    );
    propagation.setGlobalPropagator(new W3CTraceContextPropagator());
    trace.setGlobalTracerProvider(
      new TracerProvider({
        spanProcessors: [new SimpleSpanProcessor({ exporter })],
      }),
    );
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
    trace.disable();
    propagation.disable();
    context.disable();
  });

  it('o span de consumidor tem o traceId do span de produtor e é filho dele', async () => {
    exporter.reset();
    const response = await request(app.getHttpServer())
      .post('/api/diagnostics/jobs')
      .send({ outcome: 'succeed' })
      .expect(202);
    const { jobId } = response.body as { jobId: string };
    await waitForJobState(queue, jobId, 'completed');
    // O span de consumidor termina depois do estado concluído, e o export do processor é assíncrono.
    await waitForSpan(exporter, SpanKind.CONSUMER);

    const spans = exporter.getFinishedSpans();
    const producer = spans.find(
      (span) =>
        span.kind === SpanKind.PRODUCER &&
        span.attributes['bullmq.queue.name'] === DIAGNOSTICS_QUEUE,
    );
    const consumer = spans.find(
      (span) =>
        span.kind === SpanKind.CONSUMER &&
        span.attributes['bullmq.queue.name'] === DIAGNOSTICS_QUEUE,
    );
    expect(producer).toBeDefined();
    expect(consumer).toBeDefined();
    expect(consumer!.spanContext().traceId).toBe(
      producer!.spanContext().traceId,
    );
    expect(consumer!.parentSpanContext?.spanId).toBe(
      producer!.spanContext().spanId,
    );
    // Nenhum atributo traz o corpo do job.
    for (const span of [producer!, consumer!]) {
      for (const value of Object.values(span.attributes)) {
        expect(String(value)).not.toContain('outcome');
      }
    }
  });
});
