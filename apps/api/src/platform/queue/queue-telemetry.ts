import type { Context } from '@opentelemetry/api';
import type {
  AttributeValue,
  Attributes,
  Exception,
  Span,
  SpanOptions,
  Telemetry,
  Time,
  Tracer,
} from 'bullmq';
import { BullMQOtel } from 'bullmq-otel';

/**
 * Atributos do BullMQ que um span de fila pode exportar: nome da fila, operação, nome e id do job,
 * estado, tentativa, contagens, ids de worker e instantes. Fica de fora o que carrega dado do job
 * ou do erro: `bullmq.job.failed.reason` (a mensagem crua do erro, que pode citar o destinatário
 * ou o link com token), `bullmq.job.result` e `bullmq.job.progress` (o que o processador devolve),
 * `bullmq.job.options`, `bullmq.queue.options` e `bullmq.worker.options` (opções serializadas, a
 * da fila com a conexão), e as chaves de deduplicação, que a aplicação pode montar com dados do
 * job. Chave nova de uma versão do BullMQ também fica de fora até entrar nesta lista (spec da
 * fundação, Observabilidade: nenhum atributo exportado traz o conteúdo do job nem dado pessoal).
 */
const ALLOWED_ATTRIBUTES: ReadonlySet<string> = new Set([
  'bullmq.queue.name',
  'bullmq.queue.operation',
  'bullmq.queue.jobs.state',
  'bullmq.queue.drain.delay',
  'bullmq.queue.grace',
  'bullmq.queue.clean.limit',
  'bullmq.queue.clean.count',
  'bullmq.queue.rate.limit',
  'bullmq.queue.event.max.length',
  'bullmq.job.name',
  'bullmq.job.id',
  'bullmq.job.ids',
  'bullmq.job.type',
  'bullmq.job.state',
  'bullmq.job.attempts.made',
  'bullmq.job.bulk.count',
  'bullmq.job.bulk.names',
  'bullmq.job.attempt_finished_timestamp',
  'bullmq.job.processed.timestamp',
  'bullmq.job.scheduler.id',
  'bullmq.flow.name',
  'bullmq.worker.id',
  'bullmq.worker.name',
  'bullmq.worker.rate.limit',
  'bullmq.worker.do.not.wait.active',
  'bullmq.worker.force.close',
  'bullmq.worker.stalled.jobs',
  'bullmq.worker.failed.jobs',
  'bullmq.worker.jobs.to.extend.locks',
]);

/** Mantém só os atributos da lista; os demais são descartados antes de chegar ao span. */
export function redactQueueAttributes(attributes: Attributes): Attributes {
  return Object.fromEntries(
    Object.entries(attributes).filter(([key]) => ALLOWED_ATTRIBUTES.has(key)),
  );
}

/**
 * Reduz a exceção ao que o log também leva (ADR-0018, `describeError`): o nome e o `code`, sem a
 * mensagem nem o stack. O BullMQ às vezes passa só `err.message`, uma string: aí nada se
 * aproveita e fica um nome genérico.
 */
export function redactQueueException(exception: Exception): Exception {
  if (typeof exception === 'string') return { name: 'Error' };
  const name = exception.name ?? 'Error';
  return exception.code === undefined
    ? { name }
    : { name, code: exception.code };
}

/** Span do `bullmq-otel` com atributos, eventos e exceções filtrados antes de gravar. */
class RedactedQueueSpan implements Span<Context> {
  constructor(private readonly inner: Span<Context>) {}

  setSpanOnContext(ctx: Context): Context {
    return this.inner.setSpanOnContext(ctx);
  }

  setAttribute(key: string, value: AttributeValue): void {
    if (ALLOWED_ATTRIBUTES.has(key)) this.inner.setAttribute(key, value);
  }

  setAttributes(attributes: Attributes): void {
    this.inner.setAttributes(redactQueueAttributes(attributes));
  }

  addEvent(name: string, attributes?: Attributes): void {
    this.inner.addEvent(
      name,
      attributes === undefined ? undefined : redactQueueAttributes(attributes),
    );
  }

  recordException(exception: Exception, time?: Time): void {
    this.inner.recordException(redactQueueException(exception), time);
  }

  end(): void {
    this.inner.end();
  }
}

class RedactedQueueTracer implements Tracer<Context> {
  constructor(private readonly inner: Tracer<Context>) {}

  startSpan(name: string, options?: SpanOptions, context?: Context): Span {
    return new RedactedQueueSpan(this.inner.startSpan(name, options, context));
  }
}

/**
 * Telemetria das filas e dos workers (spec da fundação, Observabilidade): o `BullMQOtel` grava o
 * contexto W3C do trace ativo nos metadados do job no `add`, com um span de produtor, e o worker o
 * extrai e abre o span de consumidor como filho dele (docs.bullmq.io, Telemetry, Traces). Usa o
 * `@opentelemetry/api`: sem `OTEL_EXPORTER_OTLP_ENDPOINT` o SDK não sobe, o tracer é o nulo e
 * nada é gravado nem exportado. As métricas do pacote ficam desligadas; as de fila são do
 * `QueueMetrics` de `platform/telemetry/`, no padrão `app.queue.*`. O tracer é embrulhado para
 * que os spans só recebam os atributos de `ALLOWED_ATTRIBUTES` e a exceção reduzida a nome e
 * código: o BullMQ grava a mensagem crua do erro e o resultado do job, que podem citar o e-mail
 * ou o link com token do `email.send`.
 */
export function createQueueTelemetry(): Telemetry<Context> {
  const otel = new BullMQOtel({ tracerName: 'bullmq' });
  return {
    tracer: new RedactedQueueTracer(otel.tracer),
    contextManager: otel.contextManager,
  };
}
