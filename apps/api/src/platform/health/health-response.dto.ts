import type { HealthState } from './health-indicator.js';

/** Estado de cada dependência externa. */
export class HealthChecksDto {
  /** PostgreSQL, por `SELECT 1` pelo Prisma. */
  postgres: HealthState;

  /** Valkey, por `PING` pelo ioredis. */
  valkey: HealthState;
}

/**
 * Corpo de `GET /api/health` (spec da fundação, "Contratos de interface"): `ok` com 200 quando
 * as duas dependências respondem, `error` com 503 quando alguma não responde. Classe para o
 * plugin CLI do `@nestjs/swagger` (ADR-0020) gerar o esquema no documento.
 */
export class HealthResponseDto {
  /** `ok` quando postgres e valkey estão `up`; `error` em qualquer outro caso. */
  status: 'ok' | 'error';

  checks: HealthChecksDto;
}
