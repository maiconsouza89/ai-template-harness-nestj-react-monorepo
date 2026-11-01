import { Injectable } from '@nestjs/common';
import {
  metrics,
  type BatchObservableCallback,
  type Counter,
  type Gauge,
  type Histogram,
  type Meter,
  type MetricOptions,
  type Observable,
  type ObservableCounter,
  type ObservableGauge,
  type UpDownCounter,
} from '@opentelemetry/api';

/**
 * Limite de cada leitura feita na coleta das métricas (filas, Valkey, health check), abaixo do
 * intervalo de exportação de 60 segundos do SDK: a leitura que passa dele é abandonada pelo
 * `withTimeout` da plataforma e a métrica sai omitida naquela rodada (spec, Tratamento de erros).
 */
export const METRIC_READ_TIMEOUT_MS = 2_000;

/** Nome do `Meter` da aplicação: o escopo de instrumentação de toda métrica `app.*`. */
export const APP_METER_NAME = 'app';

/**
 * `app.<domínio>.<medida>` em minúsculas com ponto: `app`, o domínio e ao menos um segmento de
 * medida, cada segmento começando por letra e seguido de letras, dígitos ou `_`
 * (`app.queue.oldest_job.age`). Spec da fundação, Observabilidade.
 */
export const APP_METRIC_NAME_PATTERN =
  /^app\.[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

/** Lança se `name` não segue `app.<domínio>.<medida>`; quem erra o nome descobre na subida. */
export function assertAppMetricName(name: string): void {
  if (!APP_METRIC_NAME_PATTERN.test(name)) {
    throw new Error(
      `Nome de métrica fora do padrão app.<domínio>.<medida> em minúsculas: ${name}`,
    );
  }
}

/**
 * Meter da aplicação (spec da fundação, "Convenções para as features"): toda métrica criada pelo
 * código da API, de plataforma ou de negócio, nasce aqui, com nome `app.<domínio>.<medida>`,
 * unidade da UCUM (`s`, `By`, `{job}`) e atributos sem dado pessoal nem conteúdo de job. Cada RF
 * registra as suas injetando esta classe, que é global.
 *
 * Inerte sem `OTEL_EXPORTER_OTLP_ENDPOINT`: o `instrumentation.ts` não registra o SDK, o
 * `metrics.getMeter` do `@opentelemetry/api` devolve o meter nulo, os instrumentos não guardam
 * nada e as callbacks observáveis nunca são chamadas, então nenhuma leitura periódica roda. O
 * meter é lido na construção, depois de o SDK subir pelo `--import`.
 */
@Injectable()
export class AppMetrics {
  readonly meter: Meter = metrics.getMeter(APP_METER_NAME);

  createCounter(name: string, options?: MetricOptions): Counter {
    assertAppMetricName(name);
    return this.meter.createCounter(name, options);
  }

  createUpDownCounter(name: string, options?: MetricOptions): UpDownCounter {
    assertAppMetricName(name);
    return this.meter.createUpDownCounter(name, options);
  }

  createHistogram(name: string, options?: MetricOptions): Histogram {
    assertAppMetricName(name);
    return this.meter.createHistogram(name, options);
  }

  createGauge(name: string, options?: MetricOptions): Gauge {
    assertAppMetricName(name);
    return this.meter.createGauge(name, options);
  }

  createObservableGauge(
    name: string,
    options?: MetricOptions,
  ): ObservableGauge {
    assertAppMetricName(name);
    return this.meter.createObservableGauge(name, options);
  }

  createObservableCounter(
    name: string,
    options?: MetricOptions,
  ): ObservableCounter {
    assertAppMetricName(name);
    return this.meter.createObservableCounter(name, options);
  }

  /** Uma callback que lê várias métricas observáveis de uma vez, na coleta do SDK. */
  addBatchObservableCallback(
    callback: BatchObservableCallback,
    observables: Observable[],
  ): void {
    this.meter.addBatchObservableCallback(callback, observables);
  }

  removeBatchObservableCallback(
    callback: BatchObservableCallback,
    observables: Observable[],
  ): void {
    this.meter.removeBatchObservableCallback(callback, observables);
  }
}
