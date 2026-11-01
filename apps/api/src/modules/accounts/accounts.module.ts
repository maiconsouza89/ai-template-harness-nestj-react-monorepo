import { Logger, Module, type Provider } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import type { Redis } from 'ioredis';
import { ENV } from '../../platform/config/config.module.js';
import type { Env } from '../../platform/config/env.js';
import { describeError } from '../../platform/logging/describe-error.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { REDIS } from '../../platform/redis/redis.module.js';
import { createHttpRouteMiddleware } from '../../platform/telemetry/http-route.js';
import { EmailModule, RequestEmailUseCase } from '../email/email.module.js';
import {
  AUTH_BASE_PATH,
  type AuthDependencies,
  type AuthLog,
  createAuth,
  EMAIL_VERIFICATION_EXPIRES_IN,
} from './auth.js';
import { EmailVerificationLinks } from './domain/email-verification-links.js';
import { PrismaEmailVerificationLinksRepository } from './infra/email-verification/prisma-email-verification-links.repository.js';
import { ValkeyRateLimitStorage } from './infra/rate-limit/valkey-rate-limit.storage.js';
import { createSendVerificationEmail } from './infra/verification-email/send-verification-email.js';
import { GetSessionController } from './presentation/get-session/get-session.controller.js';
import {
  createSignUpHook,
  createSignUpRequestPlugin,
} from './presentation/sign-up/sign-up.hook.js';
import { createVerifyEmailPlugin } from './presentation/verify-email/verify-email.plugin.js';

/**
 * Encaminha as linhas do Better Auth ao logger do Nest, que o `main.ts` liga ao pino: saem em
 * JSON, com o `req.id` da requisição e a redação de dados pessoais (ADR-0018). Argumentos extras
 * viram só o nome do erro ou o tipo do valor, para nenhum registro de conta nem mensagem de erro
 * da biblioteca chegar inteiro ao log.
 */
export function createAuthLog(logger: Logger): AuthLog {
  return (level, message, ...args) => {
    const line = [message, ...args.map(describeError)].join(' ');
    if (level === 'error') logger.error(line);
    else if (level === 'warn') logger.warn(line);
    else if (level === 'info') logger.log(line);
    else logger.debug(line);
  };
}

/**
 * Dependências de `createAuth` montadas a partir do Valkey, do Módulo E-mail, dos registros de
 * confirmação e do logger.
 */
export function createAuthDependencies(
  env: Env,
  redis: Redis,
  requestEmail: RequestEmailUseCase,
  emailVerificationLinks: EmailVerificationLinks,
): AuthDependencies {
  const logger = new Logger('BetterAuth');
  return {
    sendVerificationEmail: createSendVerificationEmail(
      requestEmail,
      emailVerificationLinks,
      {
        webOrigin: env.WEB_ORIGIN,
        expiresInSeconds: EMAIL_VERIFICATION_EXPIRES_IN,
        secret: env.BETTER_AUTH_SECRET,
      },
    ),
    signUpHook: createSignUpHook(env.ADMIN_EMAIL),
    signUpRequestPlugin: createSignUpRequestPlugin(AUTH_BASE_PATH),
    verifyEmailPlugin: createVerifyEmailPlugin(emailVerificationLinks),
    rateLimitStorage: new ValkeyRateLimitStorage(redis, (message) =>
      logger.error(message),
    ),
    log: createAuthLog(logger),
  };
}

/** Portas do Módulo Contas ligadas às implementações de `infra/` (ADR-0025). */
const ACCOUNTS_PROVIDERS: Provider[] = [
  {
    provide: EmailVerificationLinks,
    useClass: PrismaEmailVerificationLinksRepository,
  },
];

/**
 * Módulo Contas, raiz de composição do módulo (ADR-0025): monta o Better Auth de `auth.ts` em
 * `/api/auth` e registra o guard global, que recusa com 401 toda rota sem sessão, salvo as
 * marcadas com `@AllowAnonymous()`. As camadas ficam em `domain/`, `application/<caso>/`,
 * `infra/` e `presentation/<caso>/`, criadas quando o módulo precisa delas; a regra de dependência
 * entre elas é fiscalizada no `make lint` (ADR-0026). `GET /api/v1/session` fica só em
 * `presentation/get-session/`, sem caso de uso em `application/`, porque só repassa a sessão. As
 * rotas de cadastro, entrar, sair e recuperação são do próprio Better Auth e entram pelos RF-001 a
 * RF-005 como configuração; o cadastro (RF-001) recebe aqui o hook, o envio da confirmação pelo
 * Módulo E-mail, o rate limit no Valkey e o logger; a confirmação (RF-002) recebe a porta dos
 * registros de confirmação, entregue à fábrica do Better Auth por `provideInjectionTokensFrom`,
 * que a registra dentro do módulo dinâmico dele, e com ela o callback de envio grava o registro
 * e o plugin de `/verify-email` o consome. O handler do Better Auth é montado sem caminho,
 * então o `middleware` grava `/api/auth/*` como `http.route` das requisições dele, para a métrica
 * e o span de servidor não saírem sem rota (spec da fundação, Métricas exportadas).
 */
@Module({
  imports: [
    AuthModule.forRootAsync({
      imports: [EmailModule],
      inject: [
        ENV,
        PrismaService,
        REDIS,
        RequestEmailUseCase,
        EmailVerificationLinks,
      ],
      provideInjectionTokensFrom: ACCOUNTS_PROVIDERS,
      useFactory: (
        env: Env,
        prisma: PrismaService,
        redis: Redis,
        requestEmail: RequestEmailUseCase,
        emailVerificationLinks: EmailVerificationLinks,
      ) => ({
        auth: createAuth(
          env,
          prisma,
          createAuthDependencies(
            env,
            redis,
            requestEmail,
            emailVerificationLinks,
          ),
        ),
        middleware: createHttpRouteMiddleware(`${AUTH_BASE_PATH}/*`),
      }),
    }),
  ],
  controllers: [GetSessionController],
  exports: [AuthModule],
})
export class AccountsModule {}
