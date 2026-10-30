import { sessionResponseSchema } from '@app/contracts';
import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../../auth.js';
import { SessionResponseDto } from './session-response.dto.js';

/**
 * `GET /api/v1/session`: a conta e o papel da sessão corrente. Protegida pelo guard global; sem
 * sessão válida o guard responde 401 antes de chegar aqui. A resposta passa pelo esquema de
 * Contratos para a API nunca devolver um corpo que a SPA não aceite.
 */
@ApiCookieAuth()
@Controller('session')
export class GetSessionController {
  /** Devolve o id e o papel da conta da sessão do cookie. */
  @Get()
  getSession(@Session() session: UserSession<Auth>): SessionResponseDto {
    return sessionResponseSchema.parse({
      userId: session.user.id,
      // O plugin admin grava `user` em quem se cadastra; `null` só em conta criada fora dele.
      role: session.user.role ?? 'user',
    });
  }
}
