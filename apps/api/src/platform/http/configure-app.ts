import { VersioningType, type INestApplication } from '@nestjs/common';

export const API_PREFIX = 'api';
export const API_DEFAULT_VERSION = '1';

/**
 * Aplica à aplicação o prefixo global `/api` e o versionamento por URI com `/v1` como padrão.
 * Rotas sem versão (health, auth) se marcam com `@Version(VERSION_NEUTRAL)`.
 * Compartilhado por `main.ts` e pelos testes de integração, para os dois montarem as mesmas rotas.
 */
export function configureApp<T extends INestApplication>(app: T): T {
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: API_DEFAULT_VERSION,
  });
  return app;
}
