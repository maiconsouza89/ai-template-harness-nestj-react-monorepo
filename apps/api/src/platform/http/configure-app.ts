import {
  VersioningType,
  type INestApplication,
  type NestApplicationOptions,
} from '@nestjs/common';
import type { Env } from '../config/env.js';
import { isOpenApiPublished, setupOpenApi } from '../openapi/openapi.js';

export const API_PREFIX = 'api';
export const API_DEFAULT_VERSION = '1';

/**
 * Opções de criação da aplicação, iguais em `main.ts` e nos testes de integração. O body parser
 * do Nest fica desligado porque o Better Auth lê o corpo bruto (ADR-0010); o `AuthModule`
 * religa os parsers de JSON e formulário para as outras rotas. `bufferLogs` guarda as linhas da
 * subida até `app.useLogger` ligar o pino (ADR-0018), para saírem em JSON e não no console.
 */
export const NEST_APPLICATION_OPTIONS: NestApplicationOptions = {
  bodyParser: false,
  bufferLogs: true,
};

export interface ConfigureAppOptions {
  /** Origem da SPA (`WEB_ORIGIN`); com ela, liga o CORS com credenciais só para essa origem. */
  webOrigin?: string;
  /** Publica o documento OpenAPI em `/api/docs`; falso em produção. */
  openApi?: boolean;
}

/** Deriva as opções da configuração validada: CORS para `WEB_ORIGIN` e OpenAPI fora de produção. */
export function configureAppOptionsFromEnv(
  env: Pick<Env, 'WEB_ORIGIN' | 'NODE_ENV'>,
): ConfigureAppOptions {
  return {
    webOrigin: env.WEB_ORIGIN,
    openApi: isOpenApiPublished(env.NODE_ENV),
  };
}

/**
 * Aplica à aplicação o prefixo global `/api`, o versionamento por URI com `/v1` como padrão e,
 * quando `webOrigin` vem, o CORS com credenciais restrito a ela: outra origem não recebe
 * `Access-Control-Allow-Origin`. Rotas sem versão (health) se marcam com `VERSION_NEUTRAL`.
 * Por último, com `openApi`, monta o documento OpenAPI, que precisa do prefixo e do
 * versionamento já aplicados (ADR-0020). Compartilhado por `main.ts` e pelos testes de
 * integração, para os dois montarem as mesmas rotas.
 */
export function configureApp<T extends INestApplication>(
  app: T,
  options: ConfigureAppOptions = {},
): T {
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: API_DEFAULT_VERSION,
  });
  if (options.webOrigin) {
    app.enableCors({ origin: [options.webOrigin], credentials: true });
  }
  if (options.openApi) {
    setupOpenApi(app);
  }
  return app;
}
