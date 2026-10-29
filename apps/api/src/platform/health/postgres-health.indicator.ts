import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import pg from 'pg';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import {
  HEALTH_TIMEOUT_MS,
  probeHealth,
  type HealthState,
} from './health-indicator.js';

/**
 * Verifica o PostgreSQL com `SELECT 1`. Provisório: usa um pool `pg` próprio porque o
 * `PrismaService` (fase 3 do plano da fundação) ainda não existe; a fase 3 troca este pool pelo
 * `PrismaService` e o indicador passa a usar `$queryRaw`.
 */
@Injectable()
export class PostgresHealthIndicator implements OnModuleDestroy {
  private readonly pool: pg.Pool;

  constructor(@Inject(ENV) env: Env) {
    this.pool = new pg.Pool({
      connectionString: env.DATABASE_URL,
      max: 1,
      connectionTimeoutMillis: HEALTH_TIMEOUT_MS,
      idleTimeoutMillis: 10_000,
    });
    // Conexão ociosa derrubada pelo servidor não pode virar exceção não tratada.
    this.pool.on('error', () => undefined);
  }

  check(): Promise<HealthState> {
    return probeHealth(() => this.pool.query('SELECT 1'));
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
