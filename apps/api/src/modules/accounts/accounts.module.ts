import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { ENV } from '../../platform/config/config.module.js';
import type { Env } from '../../platform/config/env.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { createAuth } from './auth.js';
import { GetSessionController } from './get-session/get-session.controller.js';
import { signUpBeforeHook } from './sign-up/sign-up.hook.js';

/**
 * Módulo Contas (ADR-0011): monta o Better Auth em `/api/auth` e registra o guard global, que
 * recusa com 401 toda rota sem sessão, salvo as marcadas com `@AllowAnonymous()`. Os casos de
 * uso do módulo ficam em pastas próprias (`get-session/`); as rotas de cadastro, entrar, sair e
 * recuperação são do próprio Better Auth e entram pelos RF-001 a RF-005 como configuração.
 */
@Module({
  imports: [
    AuthModule.forRootAsync({
      inject: [ENV, PrismaService],
      useFactory: (env: Env, prisma: PrismaService) => ({
        auth: createAuth(env, prisma, { beforeHook: signUpBeforeHook }),
      }),
    }),
  ],
  controllers: [GetSessionController],
  exports: [AuthModule],
})
export class AccountsModule {}
