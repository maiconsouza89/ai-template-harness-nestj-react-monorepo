import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Env } from '../config/env.js';

/** Caminho do documento sob o prefixo global: a interface em `/api/docs`, o JSON em `/api/docs-json`. */
export const OPENAPI_PATH = 'docs';

/** Nome do esquema de segurança do cookie de sessão; `@ApiCookieAuth()` usa o mesmo padrão. */
export const SESSION_COOKIE_SECURITY = 'cookie';

/** O documento OpenAPI é publicado só fora de produção (HLD, Interfaces públicas; ADR-0020). */
export function isOpenApiPublished(nodeEnv: Env['NODE_ENV']): boolean {
  return nodeEnv !== 'production';
}

/**
 * Monta o documento OpenAPI 3 dos controllers (ADR-0020) em `/api/docs` e `/api/docs-json`.
 * Os decorators de propriedade dos DTOs vêm do plugin CLI do `@nestjs/swagger` no `nest build`;
 * nos testes Vitest eles não existem, então só os caminhos são confiáveis ali. Chamar depois de
 * `setGlobalPrefix` e `enableVersioning`: antes deles as rotas saem sem `/api/v1`. As rotas do
 * Better Auth em `/api/auth` são middleware Express, não controllers, e ficam fora do documento.
 */
export function setupOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('API')
    .setDescription(
      'API REST v1. Toda rota exige o cookie de sessão do Better Auth, salvo a saúde em ' +
        '`/api/health`; a autenticação fica em `/api/auth` (Better Auth), fora deste documento.',
    )
    .setVersion('1')
    .addCookieAuth('better-auth.session_token')
    .build();
  SwaggerModule.setup(
    OPENAPI_PATH,
    app,
    () => SwaggerModule.createDocument(app, config),
    { useGlobalPrefix: true },
  );
}
