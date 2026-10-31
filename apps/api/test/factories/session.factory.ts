import type { INestApplication } from '@nestjs/common';
import request, { type Response } from 'supertest';
import type { App } from 'supertest/types.js';
import { adminInicial, type AdminInicial } from './user.factory.js';

export interface SessaoAdmin extends AdminInicial {
  /** Valor pronto para o cabeçalho `Cookie` das requisições seguintes. */
  cookie: string;
  /** Resposta do login, para inspecionar `Set-Cookie` e o corpo. */
  signIn: Response;
}

/** Reduz os `Set-Cookie` de uma resposta ao par `nome=valor` de cada um, para reenviar. */
export function cookieHeaderFrom(response: Response): string {
  const setCookie = response.get('Set-Cookie') ?? [];
  return setCookie.map((cookie) => cookie.split(';')[0]).join('; ');
}

/**
 * Pré-requisito `sessao-admin` do contrato: entra pela rota do Better Auth com a conta
 * `admin-inicial` (garantida antes) e devolve o cookie de sessão que ela abriu. Com o rate limit
 * ligado (RF-001), o login vai com o `X-Forwarded-For` de `ip`, um IP de documentação próprio do
 * caso, para não dividir o limite de sign-in com outros casos.
 */
export async function sessaoAdmin(
  app: INestApplication<App>,
  ip: string,
): Promise<SessaoAdmin> {
  const admin = await adminInicial(app);
  const signIn = await request(app.getHttpServer())
    .post('/api/auth/sign-in/email')
    .set('X-Forwarded-For', ip)
    .send({ email: admin.email, password: admin.password })
    .expect(200);
  return { ...admin, cookie: cookieHeaderFrom(signIn), signIn };
}
