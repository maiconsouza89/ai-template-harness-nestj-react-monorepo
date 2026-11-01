import { metrics, type Attributes } from '@opentelemetry/api';
import {
  AggregationTemporality,
  InMemoryMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
  type ResourceMetrics,
} from '@opentelemetry/sdk-metrics';

/** Um ponto exportado: escopo de instrumentação, atributos e valor (soma ou último valor). */
export interface ExportedPoint {
  scope: string;
  attributes: Attributes;
  value: number;
}

/**
 * Leitor de métricas em memória do SDK (spec da fundação, "Convenções para as features"): registra
 * um `MeterProvider` global com o `InMemoryMetricExporter`, como o `instrumentation.ts` registra o
 * de OTLP com o endpoint. Crie antes do código que chama `metrics.getMeter` (o `AppMetrics` lê o
 * meter na construção) e chame `shutdown()` no fim, que devolve o meter nulo.
 */
export function registerInMemoryMetrics() {
  const exporter = new InMemoryMetricExporter(
    AggregationTemporality.CUMULATIVE,
  );
  const reader = new PeriodicExportingMetricReader({
    exporter,
    // Só coleta quando o teste pede, por `collect()`.
    exportIntervalMillis: 2_147_483_647,
  });
  const provider = new MeterProvider({ readers: [reader] });
  metrics.setGlobalMeterProvider(provider);

  return {
    /** Roda uma coleta (as callbacks observáveis inclusive) e devolve o que foi exportado. */
    async collect(): Promise<ResourceMetrics[]> {
      exporter.reset();
      await reader.forceFlush();
      return exporter.getMetrics();
    },
    async shutdown(): Promise<void> {
      await provider.shutdown();
      metrics.disable();
    },
  };
}

/** Os pontos da métrica `name` na coleta, de qualquer escopo. */
export function pointsOf(
  collected: ResourceMetrics[],
  name: string,
): ExportedPoint[] {
  const points: ExportedPoint[] = [];
  for (const resource of collected) {
    for (const scope of resource.scopeMetrics) {
      for (const metric of scope.metrics) {
        if (metric.descriptor.name !== name) continue;
        for (const point of metric.dataPoints) {
          points.push({
            scope: scope.scope.name,
            attributes: point.attributes,
            value: point.value as number,
          });
        }
      }
    }
  }
  return points;
}
