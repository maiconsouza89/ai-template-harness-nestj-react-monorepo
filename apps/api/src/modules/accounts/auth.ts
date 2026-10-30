import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins/admin';
import type { Env } from '../../platform/config/env.js';
import type { PrismaClient } from '../../platform/prisma/prisma.service.js';

/** Caminho em que o Better Auth atende; fica fora do prefixo `/api` e do versionamento do Nest. */
export const AUTH_BASE_PATH = '/api/auth';

/** Só as variáveis que a instância usa; o seed as lê do mesmo esquema de configuração. */
export type AuthEnv = Pick<
  Env,
  | 'NODE_ENV'
  | 'BETTER_AUTH_SECRET'
  | 'BETTER_AUTH_URL'
  | 'WEB_ORIGIN'
  | 'COOKIE_DOMAIN'
>;

/**
 * Instância do Better Auth (ADR-0010) do Módulo Contas, arquivo de composição na raiz do módulo
 * (ADR-0025): sessão em cookie gravada no PostgreSQL pelo adapter Prisma e o plugin admin para
 * papéis e banimento. Na fundação só a borda existe;
 * envio de e-mail, bloqueio e rate limit entram pelos RFs. Este arquivo só importa pacotes e
 * tipos para o seed (`prisma/seed.ts`) carregá-lo direto no Node, sem compilar; o tipo do
 * cliente Prisma vem de `platform/`, porque só `infra/` e `platform/` importam o cliente gerado.
 *
 * - `trustedOrigins` e o CORS da API usam a mesma origem da SPA, `WEB_ORIGIN`.
 * - Cookie `httpOnly` (padrão), `secure` fora do ambiente local e, com `COOKIE_DOMAIN`,
 *   compartilhado entre subdomínios (`crossSubDomainCookies`).
 * - Cookie cache desligado para a revogação valer na próxima requisição.
 * - Cadastro por e-mail e senha fechado (`disableSignUp`): na fundação só o seed cria conta, o
 *   que impede alguém de registrar o e-mail de `ADMIN_EMAIL` antes do `make db-setup` e ser
 *   promovido a admin. O RF-001 reabre quando montar o fluxo de cadastro.
 * - Rate limit desligado (`rateLimit.enabled = false`): o padrão em produção é um balde em
 *   memória por processo, que não vale com réplicas e, sem `trustedProxies`, escreve um aviso
 *   fora do JSON no log. O RF-001 liga com armazenamento no Valkey e `trustedProxies`.
 */
export function createAuth(env: AuthEnv, prisma: PrismaClient) {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    basePath: AUTH_BASE_PATH,
    secret: env.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    trustedOrigins: [env.WEB_ORIGIN],
    emailAndPassword: { enabled: true, disableSignUp: true },
    session: { cookieCache: { enabled: false } },
    rateLimit: { enabled: false },
    advanced: {
      useSecureCookies: env.NODE_ENV === 'production',
      crossSubDomainCookies: env.COOKIE_DOMAIN
        ? { enabled: true, domain: env.COOKIE_DOMAIN }
        : { enabled: false },
    },
    plugins: [admin()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
