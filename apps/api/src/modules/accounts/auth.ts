import {
  betterAuth,
  type BetterAuthOptions,
  type BetterAuthRateLimitStorage,
} from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins/admin';
import type { Env } from '../../platform/config/env.js';
import type { PrismaClient } from '../../platform/prisma/prisma.service.js';
import type { SendVerificationEmail } from './infra/verification-email/send-verification-email.js';
import type { SignUpHook } from './presentation/sign-up/sign-up.hook.js';

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

/** Validade do link de confirmação de e-mail: 24 horas (spec, Regras e fluxos). */
export const EMAIL_VERIFICATION_EXPIRES_IN = 86_400;

/**
 * Regras do rate limit (HLD, Interfaces públicas): 100 requisições a cada 10 segundos por IP e
 * caminho em `/api/auth` e 5 cadastros a cada 60 segundos por IP. RF-003 e RF-005 acrescentam
 * as de sign-in e recuperação em `customRules`.
 */
export const RATE_LIMIT = {
  window: 10,
  max: 100,
  customRules: { '/sign-up/email': { window: 60, max: 5 } },
} as const;

/** Função de log que recebe as linhas do Better Auth (`logger.log`). */
export type AuthLog = NonNullable<
  NonNullable<BetterAuthOptions['logger']>['log']
>;

/**
 * Dependências da API em execução que o seed e a CLI de schema não usam (spec, Decisões):
 * entram por parâmetro, e não por import, porque este arquivo é carregado direto no Node.
 * Montadas no `accounts.module.ts`.
 */
export interface AuthDependencies {
  /** Callback que pede ao Módulo E-mail o e-mail de confirmação. */
  sendVerificationEmail: SendVerificationEmail;
  /** Hook antes do cadastro, com a validação de Contratos e a recusa de e-mail existente. */
  signUpHook: SignUpHook;
  /** Contadores do rate limit no Valkey. */
  rateLimitStorage: BetterAuthRateLimitStorage;
  /** Linhas de log da biblioteca, encaminhadas ao pino. */
  log: AuthLog;
}

/**
 * Instância do Better Auth (ADR-0010) do Módulo Contas, arquivo de composição na raiz do módulo
 * (ADR-0025): sessão em cookie gravada no PostgreSQL pelo adapter Prisma e o plugin admin para
 * papéis e banimento. Este arquivo só importa pacotes e tipos para o seed (`prisma/seed.ts`)
 * carregá-lo direto no Node, sem compilar; o tipo do cliente Prisma vem de `platform/`, porque
 * só `infra/` e `platform/` importam o cliente gerado.
 *
 * - `trustedOrigins` e o CORS da API usam a mesma origem da SPA, `WEB_ORIGIN`.
 * - Cookie `httpOnly` (padrão), `secure` fora do ambiente local e, com `COOKIE_DOMAIN`,
 *   compartilhado entre subdomínios (`crossSubDomainCookies`).
 * - Cookie cache desligado para a revogação valer na próxima requisição.
 * - Cadastro por e-mail e senha aberto (RF-001), com a confirmação do e-mail obrigatória antes
 *   de abrir sessão: o cadastro responde sem cookie e o link vale 24 horas. O seed continua
 *   recusando conta de `ADMIN_EMAIL` sem papel admin, o que impede o pré-registro do admin.
 * - IP do cliente pelo `X-Forwarded-For`, resolvido com `TRUSTED_PROXIES` quando definida; sem
 *   ela, vale um cabeçalho de um valor só e, sem cabeçalho, o endereço local em development e
 *   test (`@better-auth/core`, `utils/ip`).
 * - Com `deps` (a API em execução): hook antes do cadastro, envio do e-mail de confirmação pelo
 *   Módulo E-mail, rate limit ligado em todo ambiente com os contadores no Valkey e os logs da
 *   biblioteca no pino. Sem `deps` (seed e CLI de schema), nada disso entra e o rate limit fica
 *   desligado, porque não há requisição HTTP.
 */
export function createAuth(
  env: AuthEnv,
  prisma: PrismaClient,
  deps?: AuthDependencies,
) {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    basePath: AUTH_BASE_PATH,
    secret: env.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    trustedOrigins: [env.WEB_ORIGIN],
    emailAndPassword: { enabled: true, requireEmailVerification: true },
    emailVerification: {
      sendOnSignUp: true,
      expiresIn: EMAIL_VERIFICATION_EXPIRES_IN,
      sendVerificationEmail: deps?.sendVerificationEmail,
    },
    session: { cookieCache: { enabled: false } },
    rateLimit: deps
      ? { enabled: true, ...RATE_LIMIT, customStorage: deps.rateLimitStorage }
      : { enabled: false },
    hooks: deps ? { before: deps.signUpHook } : undefined,
    logger: deps ? { log: deps.log } : undefined,
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
