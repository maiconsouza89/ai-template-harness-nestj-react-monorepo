import {
  Controller,
  Get,
  HttpStatus,
  Res,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';
import { HealthResponseDto } from './health-response.dto.js';
import { PostgresHealthIndicator } from './postgres-health.indicator.js';
import { ValkeyHealthIndicator } from './valkey-health.indicator.js';

/**
 * `GET /api/health`, anônima e fora do versionamento (`/api/health`, não `/api/v1/health`):
 * 200 com `status: ok` quando PostgreSQL e Valkey respondem, 503 com `status: error` quando
 * algum não responde. A API segue no ar em qualquer caso. `@AllowAnonymous()` a libera do guard
 * global do Módulo Contas (spec da fundação, Regras).
 */
@AllowAnonymous()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly postgres: PostgresHealthIndicator,
    private readonly valkey: ValkeyHealthIndicator,
  ) {}

  /** Informa se a API consegue falar com o PostgreSQL e com o Valkey. */
  @Get()
  async check(
    @Res({ passthrough: true }) res: Response,
  ): Promise<HealthResponseDto> {
    const [postgres, valkey] = await Promise.all([
      this.postgres.check(),
      this.valkey.check(),
    ]);
    const ok = postgres === 'up' && valkey === 'up';
    res.status(ok ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return { status: ok ? 'ok' : 'error', checks: { postgres, valkey } };
  }
}
