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
}

/** Prazo do link de confirmação de e-mail: 24 horas (PRD, Segurança e autorização). */
export const EMAIL_VERIFICATION_EXPIRES_IN_SECONDS = 24 * 60 * 60;

/**
 * Instância do Better Auth (ADR-0010) do Módulo Contas: sessão em cookie gravada no PostgreSQL
 * pelo adapter Prisma e o plugin admin para papéis e banimento. Na fundação só a borda existe;
 * envio de e-mail, bloqueio e rate limit entram pelos RFs. Este arquivo só importa pacotes e
 * tipos para o seed (`prisma/seed.ts`) carregá-lo direto no Node, sem compilar.
 *
 * - `trustedOrigins` e o CORS da API usam a mesma origem da SPA, `WEB_ORIGIN`.
 * - Cookie `httpOnly` (padrão), `secure` fora do ambiente local e, com `COOKIE_DOMAIN`,
 *   compartilhado entre subdomínios (`crossSubDomainCookies`).
 * - Cookie cache desligado para a revogação valer na próxima requisição.
 * - Cadastro por e-mail e senha aberto (RF-001), com `requireEmailVerification`: a conta nasce
 *   pendente e o cadastro não abre sessão. O link de confirmação vale 24 horas e sai pelo
 *   `sendVerificationEmail` recebido em `deps`, que enfileira o e-mail no Módulo E-mail. A regra do cadastro fica no hook `before` recebido
 *   em `deps`. Quem registrar o e-mail de `ADMIN_EMAIL` antes do `make db-setup` ganha só uma
 *   conta comum: o seed recusa promovê-la (`SeedAdminConflictError`).
 * - Rate limit desligado (`rateLimit.enabled = false`): o padrão em produção é um balde em
 *   memória por processo, que não vale com réplicas e, sem `trustedProxies`, escreve um aviso
 *   fora do JSON no log. O RF-001 liga com armazenamento no Valkey e `trustedProxies`.
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
