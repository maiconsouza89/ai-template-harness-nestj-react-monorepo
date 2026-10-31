import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { context, propagation, SpanKind, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import {
  InMemorySpanExporter,
  type ReadableSpan,
  SimpleSpanProcessor,
  TracerProvider,
} from '@opentelemetry/sdk-trace';
import type { Queue } from 'bullmq';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import {
  EmailTransport,
  type EmailMessage,
} from '../../src/modules/email/domain/email-transport.js';
import { RequestEmailUseCase } from '../../src/modules/email/email.module.js';
import { EMAIL_SEND_QUEUE } from '../../src/modules/email/infra/queue/email-send.queue.js';
import { PrismaService } from '../../src/platform/prisma/prisma.service.js';
import { DiagnosticsModule } from '../../src/platform/diagnostics/diagnostics.module.js';
import { DIAGNOSTICS_QUEUE } from '../../src/platform/diagnostics/diagnostics.queue.js';
import { createTestApp, isolatedEmailQueue } from '../create-test-app.js';
import { waitForJobState } from '../queue-jobs.js';

/** Espera o exportador receber um span que satisfaça `matches`. */
async function waitForSpanWhere(
  exporter: InMemorySpanExporter,
  matches: (span: ReadableSpan) => boolean,
) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (exporter.getFinishedSpans().some(matches)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/** Espera o exportador receber um span da fila de diagnóstico do tipo `kind`. */
async function waitForSpan(exporter: InMemorySpanExporter, kind: SpanKind) {
  await waitForSpanWhere(
    exporter,
    (span) =>
      span.kind === kind &&
      span.attributes['bullmq.queue.name'] === DIAGNOSTICS_QUEUE,
  );
}

/** Tudo o que um span exporta como texto: atributos, eventos e os atributos deles, e o status. */
function exportedText(span: ReadableSpan): string {
  return JSON.stringify({
    name: span.name,
    attributes: span.attributes,
    events: span.events.map((event) => ({
      name: event.name,
      attributes: event.attributes,
    })),
    status: span.status,
  });
}

/**
 * Transporte que sempre rejeita com uma mensagem que cita o destinatário e o corpo (com o link e
 * o token), como a de um SMTP que ecoa o que recusou.
 */
class LeakyFailingEmailTransport extends EmailTransport {
  async verify(): Promise<void> {}

  async send(message: EmailMessage): Promise<void> {
    throw new Error(`SMTP recusou ${message.to}: ${message.text}`);
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
  let emailQueue: Queue;

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
    app = await createTestApp(
      (builder) =>
        isolatedEmailQueue(`bull-int-${randomUUID()}`)(builder)
          .overrideProvider(EmailTransport)
          .useValue(new LeakyFailingEmailTransport()),
      [
        DiagnosticsModule.register({
          NODE_ENV: 'test',
          DIAGNOSTICS_ENABLED: 'true',
        }),
      ],
    );
    queue = app.get<Queue>(getQueueToken(DIAGNOSTICS_QUEUE));
    emailQueue = app.get<Queue>(getQueueToken(EMAIL_SEND_QUEUE));
    await queue.obliterate({ force: true });
  });

  afterAll(async () => {
    await queue?.obliterate({ force: true });
    await emailQueue?.obliterate({ force: true });
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
    // Nenhum atributo nem evento traz o corpo do job ou o que o processador devolveu.
    for (const span of [producer!, consumer!]) {
      expect(exportedText(span)).not.toContain('outcome');
    }
  });

  it('o job de email.send que falha não exporta a mensagem do erro nem o conteúdo do job', async () => {
    exporter.reset();
    const email = `tracing-int-${randomUUID()}@example.com`;
    const token = `token-${randomUUID()}`;
    const user = await app.get(PrismaService).user.create({
      data: { id: randomUUID(), name: 'Teresa Rastro', email },
    });
    await app.get(RequestEmailUseCase).execute({
      type: 'verify-email',
      userId: user.id,
      url: `http://localhost:5173/confirmar-email?token=${token}`,
    });
    // O span de consumidor da primeira tentativa termina depois de o worker registrar a falha.
    await waitForSpanWhere(
      exporter,
      (span) =>
        span.kind === SpanKind.CONSUMER &&
        span.attributes['bullmq.queue.name'] === EMAIL_SEND_QUEUE,
    );

    const spans = exporter
      .getFinishedSpans()
      .filter((span) => exportedText(span).includes(EMAIL_SEND_QUEUE));
    expect(spans.some((span) => span.kind === SpanKind.CONSUMER)).toBe(true);
    for (const span of exporter.getFinishedSpans()) {
      const text = exportedText(span);
      expect(text).not.toContain(email);
      expect(text).not.toContain(token);
      expect(text).not.toContain('SMTP recusou');
      expect(text).not.toContain(user.id);
    }
  }, 20_000);
});
