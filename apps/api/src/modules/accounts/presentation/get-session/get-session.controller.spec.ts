import type { UserSession } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../../auth.js';
import { GetSessionController } from './get-session.controller.js';

/** Sessão como o guard a anexa à requisição, com só os campos que o controller lê. */
function sessionWith(user: { id: string; role?: string | null }) {
  return { user, session: {} } as unknown as UserSession<Auth>;
}

describe('GetSessionController', () => {
  const controller = new GetSessionController();

  it('devolve o id e o papel da conta da sessão', () => {
    expect(
      controller.getSession(sessionWith({ id: 'Yp3m2', role: 'admin' })),
    ).toEqual({ userId: 'Yp3m2', role: 'admin' });
  });

  it('trata conta sem papel gravado como user', () => {
    expect(
      controller.getSession(sessionWith({ id: 'Yp3m2', role: null })),
    ).toEqual({ userId: 'Yp3m2', role: 'user' });
  });

  it('recusa um papel fora do esquema de Contratos em vez de devolvê-lo', () => {
    expect(() =>
      controller.getSession(sessionWith({ id: 'Yp3m2', role: 'root' })),
    ).toThrow();
  });
});
