import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { ENV } from '../../platform/config/config.module.js';
import type { Env } from '../../platform/config/env.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { createAuth } from './auth.js';
import { GetSessionController } from './presentation/get-session/get-session.controller.js';

/**
 * Módulo Contas, raiz de composição do módulo (ADR-0025): monta o Better Auth de `auth.ts` em
 * `/api/auth` e registra o guard global, que recusa com 401 toda rota sem sessão, salvo as
 * marcadas com `@AllowAnonymous()`. As camadas ficam em `domain/`, `application/<caso>/`,
 * `infra/` e `presentation/<caso>/`, criadas quando o módulo precisa delas; a regra de dependência
 * entre elas é fiscalizada no `make lint` (ADR-0026). `GET /api/v1/session` fica só em
 * `presentation/get-session/`, sem caso de uso em `application/`, porque só repassa a sessão. As
 * rotas de cadastro, entrar, sair e recuperação são do próprio Better Auth e entram pelos RF-001 a
 * RF-005 como configuração.
 */
@Module({
  imports: [
    AuthModule.forRootAsync({
      inject: [ENV, PrismaService],
      useFactory: (env: Env, prisma: PrismaService) => ({
        auth: createAuth(env, prisma),
      }),
    }),
  ],
  controllers: [GetSessionController],
  exports: [AuthModule],
})
export class AccountsModule {}
