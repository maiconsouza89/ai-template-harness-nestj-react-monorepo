import { createHash } from 'node:crypto';
import type { EmailRequest } from '../../../email/email.module.js';
import {
  confirmEmailUrl,
  createSendVerificationEmail,
  type EmailVerificationLinkWriter,
} from './send-verification-email.js';

const options = {
  webOrigin: 'http://localhost:5173',
  expiresInSeconds: 86_400,
};

function fakeLinks(
  replaceForUser: EmailVerificationLinkWriter['replaceForUser'] = () =>
    Promise.resolve(),
) {
  return { replaceForUser: vi.fn(replaceForUser) };
}

function fakeRequester() {
  return {
    execute: vi.fn<(request: EmailRequest) => Promise<void>>(() =>
      Promise.resolve(),
    ),
  };
}

describe('createSendVerificationEmail', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('pede o envio com o link da SPA em /confirmar-email e o token', async () => {
    const requester = fakeRequester();
    const send = createSendVerificationEmail(requester, fakeLinks(), options);

    await send({
      user: {
        id: 'conta-1',
        name: 'Ana Souza',
        email: 'ana@example.com',
      } as { id: string },
      token: 'eyJ.token.assinado',
    });

    expect(requester.execute).toHaveBeenCalledWith({
      type: 'verify-email',
      userId: 'conta-1',
      url: 'http://localhost:5173/confirmar-email?token=eyJ.token.assinado',
    });
  });

  it('troca o registro da conta pelo hash do token, com vencimento em 24 horas, antes de pedir o envio', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-31T12:00:00.000Z') });
    const order: string[] = [];
    const links = fakeLinks(() => {
      order.push('replace');
      return Promise.resolve();
    });
    const requester = fakeRequester();
    requester.execute.mockImplementation(() => {
      order.push('request');
      return Promise.resolve();
    });

    await createSendVerificationEmail(
      requester,
      links,
      options,
    )({
      user: { id: 'conta-3' },
      token: 'eyJ.token.novo',
    });

    expect(order).toEqual(['replace', 'request']);
    expect(links.replaceForUser).toHaveBeenCalledWith(
      'conta-3',
      createHash('sha256').update('eyJ.token.novo').digest('hex'),
      new Date('2026-11-01T12:00:00.000Z'),
    );
  });

  it('não grava o token em texto puro', async () => {
    const links = fakeLinks();
    await createSendVerificationEmail(
      fakeRequester(),
      links,
      options,
    )({
      user: { id: 'conta-4' },
      token: 'eyJ.token.secreto',
    });

    expect(JSON.stringify(links.replaceForUser.mock.calls)).not.toContain(
      'eyJ.token.secreto',
    );
  });

  it('não pede o envio quando a troca do registro falha', async () => {
    const requester = fakeRequester();
    const send = createSendVerificationEmail(
      requester,
      fakeLinks(() => Promise.reject(new Error('banco fora'))),
      options,
    );

    await expect(send({ user: { id: 'c' }, token: 't' })).rejects.toThrow(
      'banco fora',
    );
    expect(requester.execute).not.toHaveBeenCalled();
  });

  it('não leva nome, e-mail nem senha no pedido', async () => {
    const requester = fakeRequester();
    const user = {
      id: 'conta-2',
      name: 'Ana Souza',
      email: 'ana@example.com',
      password: 'Segura123',
    };

    await createSendVerificationEmail(
      requester,
      fakeLinks(),
      options,
    )({
      user,
      token: 't',
    });

    const serialized = JSON.stringify(requester.execute.mock.calls[0]?.[0]);
    expect(serialized).not.toContain('Ana Souza');
    expect(serialized).not.toContain('ana@example.com');
    expect(serialized).not.toContain('Segura123');
  });

  it('propaga a falha ao enfileirar para a biblioteca registrar', async () => {
    const send = createSendVerificationEmail(
      { execute: () => Promise.reject(new Error('fila fora')) },
      fakeLinks(),
      options,
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
