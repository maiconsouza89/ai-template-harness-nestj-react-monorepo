import { Logger, Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import type { Redis } from 'ioredis';
import { ENV } from '../../platform/config/config.module.js';
import type { Env } from '../../platform/config/env.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { REDIS } from '../../platform/redis/redis.module.js';
import { EmailQueue } from '../email/email-queue.js';
import { EmailModule } from '../email/email.module.js';
import { createAuth } from './auth.js';
import { GetSessionController } from './get-session/get-session.controller.js';
import { createValkeyRateLimitStorage } from './infra/valkey-rate-limit.storage.js';
import { createSendVerificationEmail } from './sign-up/send-verification-email.js';
import { signUpBeforeHook } from './sign-up/sign-up.hook.js';

/**
 * Módulo Contas (ADR-0011): monta o Better Auth em `/api/auth` e registra o guard global, que
 * recusa com 401 toda rota sem sessão, salvo as marcadas com `@AllowAnonymous()`. Os casos de
 * uso do módulo ficam em pastas próprias (`get-session/`, `sign-up/`); as rotas de autenticação
 * são do próprio Better Auth e entram como configuração do `createAuth`. O cadastro, com a regra
 * no hook `before`, o envio do link de confirmação e o rate limit estão ligados desde o RF-001;
 * entrar, sair e recuperação entram pelos RF-003 a RF-005. Importa o Módulo E-mail para o
 * callback de envio do link e usa a conexão compartilhada com o Valkey para os contadores do
 * rate limit.
 */
@Module({
  imports: [
    AuthModule.forRootAsync({
      imports: [EmailModule],
      inject: [ENV, PrismaService, EmailQueue, REDIS],
      useFactory: (
        env: Env,
        prisma: PrismaService,
        emailQueue: EmailQueue,
        redis: Redis,
      ) => ({
        auth: createAuth(env, prisma, {
          beforeHook: signUpBeforeHook,
          sendVerificationEmail: createSendVerificationEmail(
            emailQueue,
            new Logger('SignUp'),
          ),
          rateLimitStorage: createValkeyRateLimitStorage(
            redis,
            new Logger('RateLimit'),
          ),
        }),
      }),
    }),
  ],
  controllers: [GetSessionController],
  exports: [AuthModule],
})
export class AccountsModule {}
