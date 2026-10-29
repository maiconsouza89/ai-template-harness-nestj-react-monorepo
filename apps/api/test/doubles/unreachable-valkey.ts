import type { TestingModuleBuilder } from '@nestjs/testing';
import { loadEnv } from '../../src/platform/config/env.js';
import { createRedis, REDIS } from '../../src/platform/redis/redis.module.js';

/** Porta sem nada escutando: a conexão é recusada como com o serviço valkey parado. */
const UNREACHABLE_REDIS_URL = 'redis://127.0.0.1:1/1';

/**
 * Troca a conexão compartilhada com o Valkey (`REDIS`) por uma, criada como a real, apontada para
 * uma porta fechada: simula o Valkey fora do ar para o rate limit sem parar o serviço do Compose,
 * que os outros arquivos de integração usam ao mesmo tempo. Para `createTestApp({ override })`.
 */
export function withUnreachableValkey(builder: TestingModuleBuilder) {
  return builder
    .overrideProvider(REDIS)
    .useValue(createRedis({ ...loadEnv(), REDIS_URL: UNREACHABLE_REDIS_URL }));
}
