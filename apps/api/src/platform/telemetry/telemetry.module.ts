import { Global, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { HealthModule } from '../health/health.module.js';
import { AppMetrics } from './app-metrics.js';
import { ComponentMetrics } from './component-metrics.js';
import { QueueMetrics } from './queue-metrics.js';

/**
 * Métricas da aplicação (spec da fundação, Observabilidade; ADR-0019): o `AppMetrics`, global,
 * onde cada módulo registra as próprias métricas `app.<domínio>.<medida>`, e as métricas de
 * plataforma, `QueueMetrics` (toda fila do BullMQ) e `ComponentMetrics` (memória do Valkey e
 * health check). Tudo inerte sem `OTEL_EXPORTER_OTLP_ENDPOINT`. As métricas de HTTP e do pool do
 * PostgreSQL vêm da auto-instrumentação do `instrumentation.ts`, não daqui.
 */
@Global()
@Module({
  imports: [DiscoveryModule, HealthModule],
  providers: [AppMetrics, QueueMetrics, ComponentMetrics],
  exports: [AppMetrics],
})
export class TelemetryModule {}
