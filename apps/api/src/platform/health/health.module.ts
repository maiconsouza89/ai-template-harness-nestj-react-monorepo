import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { PostgresHealthIndicator } from './postgres-health.indicator.js';
import { ValkeyHealthIndicator } from './valkey-health.indicator.js';

/** Rota de saúde da API (HLD, Observabilidade). Depende de `ConfigModule` e `RedisModule`, globais. */
@Module({
  controllers: [HealthController],
  providers: [PostgresHealthIndicator, ValkeyHealthIndicator],
})
export class HealthModule {}
