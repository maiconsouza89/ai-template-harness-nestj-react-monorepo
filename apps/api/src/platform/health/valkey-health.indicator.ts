import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS } from '../redis/redis.module.js';
import { probeHealth, type HealthState } from './health-indicator.js';

/** Verifica o Valkey com `PING` pela conexão compartilhada do `RedisModule`. */
@Injectable()
export class ValkeyHealthIndicator {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  check(): Promise<HealthState> {
    return probeHealth(() => this.redis.ping());
  }
}
