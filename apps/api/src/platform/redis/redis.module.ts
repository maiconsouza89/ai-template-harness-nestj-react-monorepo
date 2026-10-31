import {
  Global,
  Inject,
  Logger,
  Module,
  type OnModuleDestroy,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';

/** Token da conexão compartilhada com o Valkey; injete com `@Inject(REDIS) private readonly redis: Redis`. */
export const REDIS = Symbol('REDIS');

/** Cria a conexão com o Valkey a partir de `REDIS_URL`, sem conectar ainda (`lazyConnect`). */
export function createRedis(env: Env): Redis {
  const logger = new Logger('Redis');
  const redis = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });
  // Sem ouvinte, o ioredis imprime "[ioredis] Unhandled error event" a cada tentativa.
  redis.on('error', (error: Error) =>
    logger.warn(`Valkey indisponível: ${error.message}`),
  );
  return redis;
}

/**
 * Conexão `ioredis` 5 com o Valkey (ADR-0014), apontada para `REDIS_URL` e compartilhada pela
 * aplicação: o health check a usa agora, e o rate limit do Better Auth a usa a partir do RF-001.
 * O BullMQ tem conexão própria, em `platform/queue/`, porque o worker pede outras opções. `lazyConnect` deixa a API subir com o Valkey fora do ar; o
 * `ioredis` reconecta sozinho quando ele volta.
 */
@Global()
@Module({
  providers: [{ provide: REDIS, inject: [ENV], useFactory: createRedis }],
  exports: [REDIS],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  onModuleDestroy() {
    this.redis.disconnect();
  }
}
