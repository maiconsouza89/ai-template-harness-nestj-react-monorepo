import type { EmailRequest } from '../../../email/email.module.js';
import {
  confirmEmailUrl,
  createSendVerificationEmail,
} from './send-verification-email.js';

describe('createSendVerificationEmail', () => {
  it('pede o envio com o link da SPA em /confirmar-email e o token', async () => {
    const execute = vi.fn<(request: EmailRequest) => Promise<void>>(() =>
      Promise.resolve(),
    );
    const send = createSendVerificationEmail(
      { execute },
      'http://localhost:5173',
    );

    await send({
      user: {
        id: 'conta-1',
        name: 'Ana Souza',
        email: 'ana@example.com',
      } as { id: string },
      token: 'eyJ.token.assinado',
    });

    expect(execute).toHaveBeenCalledWith({
      type: 'verify-email',
      userId: 'conta-1',
      url: 'http://localhost:5173/confirmar-email?token=eyJ.token.assinado',
    });
  });

  it('não leva nome, e-mail nem senha no pedido', async () => {
    const execute = vi.fn<(request: EmailRequest) => Promise<void>>(() =>
      Promise.resolve(),
    );
    const user = {
      id: 'conta-2',
      name: 'Ana Souza',
      email: 'ana@example.com',
      password: 'Segura123',
    };

    await createSendVerificationEmail(
      { execute },
      'http://localhost:5173',
    )({
      user,
      token: 't',
    });

    const serialized = JSON.stringify(execute.mock.calls[0]?.[0]);
    expect(serialized).not.toContain('Ana Souza');
    expect(serialized).not.toContain('ana@example.com');
    expect(serialized).not.toContain('Segura123');
  });

  it('propaga a falha ao enfileirar para a biblioteca registrar', async () => {
    const send = createSendVerificationEmail(
      { execute: () => Promise.reject(new Error('fila fora')) },
      'http://localhost:5173',
    );
    await expect(send({ user: { id: 'c' }, token: 't' })).rejects.toThrow(
      'fila fora',
    );
  });

  it('codifica o token na query string', () => {
    expect(confirmEmailUrl('https://app.example', 'a+b/c=')).toBe(
      'https://app.example/confirmar-email?token=a%2Bb%2Fc%3D',
    );
  });
});
