import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import { Logger as PinoLogger } from 'nestjs-pino';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { ENV } from '../src/platform/config/config.module.js';
import type { Env } from '../src/platform/config/env.js';
import {
  configureApp,
  configureAppOptionsFromEnv,
  NEST_APPLICATION_OPTIONS,
} from '../src/platform/http/configure-app.js';

/**
 * Sobe a aplicação inteira como o `main.ts` a sobe (mesmas opções de criação, logger pino,
 * prefixo, versionamento, CORS e documento OpenAPI), com a configuração do `.env.test` e os
 * serviços do Compose vistos do host. Quem chama fecha com `app.close()`. `customize` recebe o
 * builder antes da compilação, para trocar providers por dublês de `test/doubles/` com
 * `overrideProvider()`.
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
  return app;
}
