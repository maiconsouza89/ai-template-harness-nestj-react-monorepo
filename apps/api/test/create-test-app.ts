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

export interface CreateTestAppOptions {
  /**
   * Troca providers antes de compilar, com `overrideProvider()` do `@nestjs/testing`: é por aqui
   * que os dublês de `test/doubles/` entram (spec da fundação, "Convenções para as features").
   */
  override?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
}

/**
 * Sobe a aplicação inteira como o `main.ts` a sobe (mesmas opções de criação, logger pino,
 * prefixo, versionamento, CORS e documento OpenAPI), com a configuração do `.env.test` e os
 * serviços do Compose vistos do host. Quem chama fecha com `app.close()`.
 */
export async function createTestApp(
  options: CreateTestAppOptions = {},
): Promise<INestApplication<App>> {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  const moduleRef = await (options.override?.(builder) ?? builder).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>(
    NEST_APPLICATION_OPTIONS,
  );
  app.useLogger(app.get(PinoLogger));
  configureApp(app, configureAppOptionsFromEnv(app.get<Env>(ENV)));
  await app.init();
  return app;
}
