import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import type { Redis } from 'ioredis';
import { Logger as PinoLogger } from 'nestjs-pino';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { RATE_LIMIT_KEY_PREFIX } from '../src/modules/accounts/infra/rate-limit/valkey-rate-limit.storage.js';
import { ENV } from '../src/platform/config/config.module.js';
import type { Env } from '../src/platform/config/env.js';
import {
  configureApp,
  configureAppOptionsFromEnv,
  NEST_APPLICATION_OPTIONS,
} from '../src/platform/http/configure-app.js';
import { REDIS } from '../src/platform/redis/redis.module.js';

/**
 * Apaga os contadores do rate limit (`rate-limit:*`) do banco do Valkey dos testes (banco 1 do
 * `.env.test`): pré-requisito `janela-de-cadastro-livre` do contrato, para nenhum caso começar com
 * a janela de cadastro de um IP já consumida por uma execução anterior.
 */
export async function clearRateLimitCounters(redis: Redis): Promise<void> {
  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(
      cursor,
      'MATCH',
      `${RATE_LIMIT_KEY_PREFIX}*`,
      'COUNT',
      100,
    );
    if (keys.length > 0) await redis.del(...keys);
    cursor = next;
  } while (cursor !== '0');
}

/**
 * Sobe a aplicação inteira como o `main.ts` a sobe (mesmas opções de criação, logger pino,
 * prefixo, versionamento, CORS e documento OpenAPI), com a configuração do `.env.test` e os
 * serviços do Compose vistos do host, e com os contadores do rate limit apagados. Quem chama
 * fecha com `app.close()`. `customize` recebe o builder antes da compilação, para trocar
 * providers por dublês de `test/doubles/` com `overrideProvider()`.
 */
export async function createTestApp(
  customize: (builder: TestingModuleBuilder) => TestingModuleBuilder = (
    builder,
  ) => builder,
): Promise<INestApplication<App>> {
  const moduleRef = await customize(
    Test.createTestingModule({ imports: [AppModule] }),
  ).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>(
    NEST_APPLICATION_OPTIONS,
  );
  app.useLogger(app.get(PinoLogger));
  configureApp(app, configureAppOptionsFromEnv(app.get<Env>(ENV)));
  await app.init();
  await clearRateLimitCounters(app.get<Redis>(REDIS));
  return app;
}
