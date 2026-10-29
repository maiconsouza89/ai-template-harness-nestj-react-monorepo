import {
  VersioningType,
  type INestApplication,
  type NestApplicationOptions,
} from '@nestjs/common';

export const API_PREFIX = 'api';
export const API_DEFAULT_VERSION = '1';

/**
 * Opções de criação da aplicação, iguais em `main.ts` e nos testes de integração. O body parser
 * do Nest fica desligado porque o Better Auth lê o corpo bruto (ADR-0010); o `AuthModule`
 * religa os parsers de JSON e formulário para as outras rotas.
 */
export const NEST_APPLICATION_OPTIONS: NestApplicationOptions = {
  bodyParser: false,
};

export interface ConfigureAppOptions {
  /** Origem da SPA (`WEB_ORIGIN`); com ela, liga o CORS com credenciais só para essa origem. */
  webOrigin?: string;
}

/**
 * Aplica à aplicação o prefixo global `/api`, o versionamento por URI com `/v1` como padrão e,
 * quando `webOrigin` vem, o CORS com credenciais restrito a ela: outra origem não recebe
 * `Access-Control-Allow-Origin`. Rotas sem versão (health) se marcam com `VERSION_NEUTRAL`.
 * Compartilhado por `main.ts` e pelos testes de integração, para os dois montarem as mesmas rotas.
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
  return app;
}
