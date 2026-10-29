import {
  Controller,
  Get,
  HttpStatus,
  Res,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import type { Response } from 'express';
import type { HealthState } from './health-indicator.js';
import { PostgresHealthIndicator } from './postgres-health.indicator.js';
import { ValkeyHealthIndicator } from './valkey-health.indicator.js';

/** Corpo de `GET /api/health` (spec da fundação, "Contratos de interface"). */
export interface HealthResponse {
  status: 'ok' | 'error';
  checks: {
    postgres: HealthState;
    valkey: HealthState;
  };
}

/**
 * `GET /api/health`, anônima e fora do versionamento (`/api/health`, não `/api/v1/health`):
 * 200 com `status: ok` quando PostgreSQL e Valkey respondem, 503 com `status: error` quando
 * algum não responde. A API segue no ar em qualquer caso.
 */
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly postgres: PostgresHealthIndicator,
    private readonly valkey: ValkeyHealthIndicator,
  ) {}

  @Get()
  async check(
    @Res({ passthrough: true }) res: Response,
  ): Promise<HealthResponse> {
    const [postgres, valkey] = await Promise.all([
      this.postgres.check(),
      this.valkey.check(),
    ]);
    const ok = postgres === 'up' && valkey === 'up';
    res.status(ok ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return { status: ok ? 'ok' : 'error', checks: { postgres, valkey } };
  }
}
