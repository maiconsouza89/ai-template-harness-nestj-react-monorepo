import type { BetterAuthRateLimitStorage } from '@better-auth/core';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins/admin';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { Env } from '../../platform/config/env.js';

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
  | 'TRUSTED_PROXIES'
>;

/**
 * Dependências que o `AccountsModule` monta e passa ao `createAuth`. Entram por parâmetro para
 * este arquivo seguir importando só pacotes e tipos; o seed chama sem elas.
 */
export interface AuthDependencies {
  /** Hook `before` do cadastro (`sign-up/sign-up.hook.ts`): validação, normalização e duplicado. */
  beforeHook?: NonNullable<BetterAuthOptions['hooks']>['before'];
  /**
   * Callback de envio do link de confirmação (`sign-up/send-verification-email.ts`), que agenda
   * o job na fila `email.send` depois do commit. Sem ele (seed), nenhum e-mail é enviado.
   */
  sendVerificationEmail?: NonNullable<
    BetterAuthOptions['emailVerification']
  >['sendVerificationEmail'];
  /**
   * Armazenamento dos contadores do rate limit no Valkey, com fail-open
   * (`infra/valkey-rate-limit.storage.ts`). Sem ele (seed), o rate limit fica desligado, em vez
   * de cair no balde em memória da biblioteca.
   */
  rateLimitStorage?: BetterAuthRateLimitStorage;
}

/** Janela padrão do rate limit por IP em `/api/auth`: 100 requisições a cada 10 s (HLD). */
const RATE_LIMIT_DEFAULT = { window: 10, max: 100 } as const;

/** Sign-up, sign-in e recuperação: 5 requisições a cada 60 s por IP (HLD, Interfaces públicas). */
const RATE_LIMIT_SENSITIVE = { window: 60, max: 5 } as const;

/**
 * Regras por caminho, relativas ao `basePath`; sobrescrevem a regra especial da biblioteca para
 * `/sign-up` e `/sign-in` (10 s e 3). `/send-verification-email` fica no padrão dela (60 s e 3).
 */
export const RATE_LIMIT_CUSTOM_RULES = {
  '/sign-up/email': RATE_LIMIT_SENSITIVE,
  '/sign-in/email': RATE_LIMIT_SENSITIVE,
  '/request-password-reset': RATE_LIMIT_SENSITIVE,
} as const;

/** Prazo do link de confirmação de e-mail: 24 horas (PRD, Segurança e autorização). */
export const EMAIL_VERIFICATION_EXPIRES_IN_SECONDS = 24 * 60 * 60;

/**
 * Instância do Better Auth (ADR-0010) do Módulo Contas: sessão em cookie gravada no PostgreSQL
 * pelo adapter Prisma e o plugin admin para papéis e banimento. O cadastro, o envio do link de
 * confirmação e o rate limit vieram com o RF-001; o bloqueio por tentativas erradas entra com o
 * RF-003. Este arquivo só importa pacotes e tipos para o seed (`prisma/seed.ts`) carregá-lo
 * direto no Node, sem compilar; o que depende do Nest chega montado em `deps`.
 *
 * - `trustedOrigins` e o CORS da API usam a mesma origem da SPA, `WEB_ORIGIN`.
 * - Cookie `httpOnly` (padrão), `secure` fora do ambiente local e, com `COOKIE_DOMAIN`,
 *   compartilhado entre subdomínios (`crossSubDomainCookies`).
 * - Cookie cache desligado para a revogação valer na próxima requisição.
 * - Cadastro por e-mail e senha aberto (RF-001), com `requireEmailVerification`: a conta nasce
 *   pendente e o cadastro não abre sessão. O link de confirmação vale 24 horas e sai pelo
 *   `sendVerificationEmail` recebido em `deps`, que enfileira o e-mail no Módulo E-mail. A
 *   regra do cadastro fica no hook `before` recebido em `deps`. Quem registrar o e-mail de `ADMIN_EMAIL` antes do `make db-setup` ganha só uma
 *   conta comum: o seed recusa promovê-la (`SeedAdminConflictError`).
 * - Rate limit por IP com os contadores no Valkey (`rateLimitStorage` recebido em `deps`, com
 *   fail-open) e o IP lido do `X-Forwarded-For` atrás dos proxies de `TRUSTED_PROXIES`; sem
 *   `deps.rateLimitStorage` (seed), fica desligado.
 */
export function createAuth(
  env: AuthEnv,
  prisma: PrismaClient,
  deps: AuthDependencies = {},
) {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    basePath: AUTH_BASE_PATH,
    secret: env.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    trustedOrigins: [env.WEB_ORIGIN],
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
      requireEmailVerification: true,
    },
    emailVerification: {
      sendOnSignUp: true,
      expiresIn: EMAIL_VERIFICATION_EXPIRES_IN_SECONDS,
      sendVerificationEmail: deps.sendVerificationEmail,
    },
    hooks: { before: deps.beforeHook },
    session: { cookieCache: { enabled: false } },
    rateLimit: {
      enabled: deps.rateLimitStorage !== undefined,
      ...RATE_LIMIT_DEFAULT,
      customRules: RATE_LIMIT_CUSTOM_RULES,
      customStorage: deps.rateLimitStorage,
    },
    advanced: {
      ipAddress: { trustedProxies: env.TRUSTED_PROXIES },
      useSecureCookies: env.NODE_ENV === 'production',
      crossSubDomainCookies: env.COOKIE_DOMAIN
        ? { enabled: true, domain: env.COOKIE_DOMAIN }
        : { enabled: false },
    },
    plugins: [admin()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
