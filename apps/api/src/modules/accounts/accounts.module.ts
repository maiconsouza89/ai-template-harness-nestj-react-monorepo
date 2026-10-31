import { Logger, Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import type { Redis } from 'ioredis';
import { ENV } from '../../platform/config/config.module.js';
import type { Env } from '../../platform/config/env.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { REDIS } from '../../platform/redis/redis.module.js';
import { EmailModule, RequestEmailUseCase } from '../email/email.module.js';
import { type AuthDependencies, type AuthLog, createAuth } from './auth.js';
import { ValkeyRateLimitStorage } from './infra/rate-limit/valkey-rate-limit.storage.js';
import { createSendVerificationEmail } from './infra/verification-email/send-verification-email.js';
import { GetSessionController } from './presentation/get-session/get-session.controller.js';
import { signUpHook } from './presentation/sign-up/sign-up.hook.js';

/**
 * Descreve um argumento extra da linha do Better Auth: de um erro, só o nome e o `code` (o
 * `P2002` do Prisma, o `ECONNREFUSED` do Node); de qualquer outro valor, só o tipo. A mensagem do
 * erro fica de fora porque pode citar dado pessoal: a do Prisma traz o trecho do código que fez a
 * chamada e, na validação, os argumentos, e a de driver e SMTP pode citar o valor recusado ou o
 * destinatário. É a mesma regra dos logs do worker do Módulo E-mail.
 */
export function describeLogArgument(argument: unknown): string {
  if (argument instanceof Error) {
    const code = (argument as { code?: unknown }).code;
    return typeof code === 'string' || typeof code === 'number'
      ? `${argument.name} (${code})`
      : argument.name;
  }
  return typeof argument;
}

/**
 * Encaminha as linhas do Better Auth ao logger do Nest, que o `main.ts` liga ao pino: saem em
 * JSON, com o `req.id` da requisição e a redação de dados pessoais (ADR-0018). Argumentos extras
 * viram só o nome do erro ou o tipo do valor, para nenhum registro de conta nem mensagem de erro
 * da biblioteca chegar inteiro ao log.
 */
export function createAuthLog(logger: Logger): AuthLog {
  return (level, message, ...args) => {
    const line = [message, ...args.map(describeLogArgument)].join(' ');
    if (level === 'error') logger.error(line);
    else if (level === 'warn') logger.warn(line);
    else if (level === 'info') logger.log(line);
    else logger.debug(line);
  };
}

/** Dependências de `createAuth` montadas a partir do Valkey, do Módulo E-mail e do logger. */
export function createAuthDependencies(
  env: Env,
  redis: Redis,
  requestEmail: RequestEmailUseCase,
): AuthDependencies {
  const logger = new Logger('BetterAuth');
  return {
    sendVerificationEmail: createSendVerificationEmail(
      requestEmail,
      env.WEB_ORIGIN,
    ),
    signUpHook,
    rateLimitStorage: new ValkeyRateLimitStorage(redis, (message) =>
      logger.error(message),
    ),
    log: createAuthLog(logger),
  };
}

/**
 * Módulo Contas, raiz de composição do módulo (ADR-0025): monta o Better Auth de `auth.ts` em
 * `/api/auth` e registra o guard global, que recusa com 401 toda rota sem sessão, salvo as
 * marcadas com `@AllowAnonymous()`. As camadas ficam em `domain/`, `application/<caso>/`,
 * `infra/` e `presentation/<caso>/`, criadas quando o módulo precisa delas; a regra de dependência
 * entre elas é fiscalizada no `make lint` (ADR-0026). `GET /api/v1/session` fica só em
 * `presentation/get-session/`, sem caso de uso em `application/`, porque só repassa a sessão. As
 * rotas de cadastro, entrar, sair e recuperação são do próprio Better Auth e entram pelos RF-001 a
 * RF-005 como configuração; o cadastro (RF-001) recebe aqui o hook, o envio da confirmação pelo
 * Módulo E-mail, o rate limit no Valkey e o logger.
 */
@Module({
  imports: [
    AuthModule.forRootAsync({
      imports: [EmailModule],
      inject: [ENV, PrismaService, REDIS, RequestEmailUseCase],
      useFactory: (
        env: Env,
        prisma: PrismaService,
        redis: Redis,
        requestEmail: RequestEmailUseCase,
      ) => ({
        auth: createAuth(
          env,
          prisma,
          createAuthDependencies(env, redis, requestEmail),
        ),
      }),
    }),
  ],
  controllers: [GetSessionController],
  exports: [AuthModule],
})
export class AccountsModule {}
