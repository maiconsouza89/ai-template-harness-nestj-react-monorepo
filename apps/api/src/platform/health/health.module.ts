import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { PostgresHealthIndicator } from './postgres-health.indicator.js';
import { ValkeyHealthIndicator } from './valkey-health.indicator.js';

/**
 * Rota de saúde da API (HLD, Observabilidade). Depende de `ConfigModule` e `RedisModule`, globais.
 * Exporta os indicadores para o `ComponentMetrics` de `platform/telemetry/` exportar o mesmo
 * estado em `app.health.status`.
 */
@Module({
  controllers: [HealthController],
  providers: [PostgresHealthIndicator, ValkeyHealthIndicator],
  exports: [PostgresHealthIndicator, ValkeyHealthIndicator],
})
export class HealthModule {}
