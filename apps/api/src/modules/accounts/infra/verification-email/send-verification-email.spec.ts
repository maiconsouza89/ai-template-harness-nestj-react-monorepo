import { createHash } from 'node:crypto';
import { verifyJWT } from 'better-auth/crypto';
import type { EmailRequest } from '../../../email/email.module.js';
import {
  confirmEmailUrl,
  createSendVerificationEmail,
  EXPIRED_LINK_CLEANUP_BATCH,
  EXPIRED_LINK_RETENTION_MS,
  type EmailVerificationLinkWriter,
} from './send-verification-email.js';

// Segredo falso de baixa entropia, só para assinar e conferir o token no teste.
const SECRET = 'x'.repeat(32);

const options = {
  webOrigin: 'http://localhost:5173',
  expiresInSeconds: 86_400,
  secret: SECRET,
};

/** Token do link pedido ao Módulo E-mail na chamada `call` do dublê. */
function sentToken(
  requester: ReturnType<typeof fakeRequester>,
  call = 0,
): string {
  const url = requester.execute.mock.calls[call]?.[0].url ?? '';
  return new URL(url).searchParams.get('token') ?? '';
}

/** Porta dublê; registra em `order` cada chamada, junto com as do pedido de envio. */
function fakeLinks(
  overrides: Partial<EmailVerificationLinkWriter> = {},
  order: string[] = [],
) {
  return {
    create: vi.fn<EmailVerificationLinkWriter['create']>(
      (userId, _hash, _expiresAt) => {
        order.push('create');
        return overrides.create
          ? overrides.create(userId, _hash, _expiresAt)
          : Promise.resolve({
              id: 'registro-novo',
              userId,
              createdAt: new Date('2026-10-31T12:00:00.000Z'),
            });
      },
    ),
    deleteExpiredBefore: vi.fn<
      EmailVerificationLinkWriter['deleteExpiredBefore']
    >((cutoff, limit) => {
      order.push('deleteExpiredBefore');
      return (
        overrides.deleteExpiredBefore?.(cutoff, limit) ?? Promise.resolve(0)
      );
    }),
    deleteOlderForUser: vi.fn<
      EmailVerificationLinkWriter['deleteOlderForUser']
    >((link) => {
      order.push('deleteOlderForUser');
      return overrides.deleteOlderForUser?.(link) ?? Promise.resolve(1);
    }),
    deleteById: vi.fn<EmailVerificationLinkWriter['deleteById']>((id) => {
      order.push('deleteById');
      return overrides.deleteById?.(id) ?? Promise.resolve(true);
    }),
  };
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

  it('pede o envio com o link da SPA em /confirmar-email e um JWT do e-mail com o segredo', async () => {
    const requester = fakeRequester();
    const send = createSendVerificationEmail(requester, fakeLinks(), options);

    await send({
      user: { id: 'conta-1', email: 'Ana@Example.com' },
      token: 'eyJ.token.da-biblioteca',
    });

    const [request] = requester.execute.mock.calls[0] ?? [];
    expect(request).toMatchObject({ type: 'verify-email', userId: 'conta-1' });
    expect(request?.url).toMatch(
      /^http:\/\/localhost:5173\/confirmar-email\?token=[^&]+$/,
    );
    const token = sentToken(requester);
    expect(token).not.toBe('eyJ.token.da-biblioteca');
    const payload = await verifyJWT(token, SECRET);
    expect(payload).toMatchObject({ email: 'ana@example.com' });
    expect((payload?.exp ?? 0) - (payload?.iat ?? 0)).toBe(86_400);
    await expect(verifyJWT(token, 'outro-segredo')).resolves.toBeNull();
  });

  it('dois envios no mesmo segundo para a mesma conta geram links diferentes', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-31T12:00:00.000Z') });
    const requester = fakeRequester();
    const send = createSendVerificationEmail(requester, fakeLinks(), options);
    const data = {
      user: { id: 'conta-5', email: 'nina@example.com' },
      token: 't',
    };

    await send(data);
    await send(data);

    expect(sentToken(requester, 0)).not.toBe(sentToken(requester, 1));
  });

  it('grava o registro pelo hash do token, com vencimento em 24 horas, pede o envio e só então apaga os anteriores', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-31T12:00:00.000Z') });
    const order: string[] = [];
    const links = fakeLinks({}, order);
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
      user: { id: 'conta-3', email: 'ana@example.com' },
      token: 'eyJ.token.novo',
    });

    expect(order).toEqual([
      'create',
      'deleteExpiredBefore',
      'request',
      'deleteOlderForUser',
    ]);
    expect(links.create).toHaveBeenCalledWith(
      'conta-3',
      createHash('sha256').update(sentToken(requester)).digest('hex'),
      new Date('2026-11-01T12:00:00.000Z'),
    );
    expect(links.deleteOlderForUser).toHaveBeenCalledWith({
      id: 'registro-novo',
      userId: 'conta-3',
      createdAt: new Date('2026-10-31T12:00:00.000Z'),
    });
    expect(links.deleteById).not.toHaveBeenCalled();
  });

  it('apaga até 100 registros vencidos há mais de 7 dias em cada envio', async () => {
    const links = fakeLinks();
    const now = new Date('2026-10-31T12:00:00.000Z');

    await createSendVerificationEmail(
      fakeRequester(),
      links,
      options,
      () => now,
    )({ user: { id: 'conta-7', email: 'ana@example.com' }, token: 't' });

    expect(EXPIRED_LINK_RETENTION_MS).toBe(7 * 86_400_000);
    expect(EXPIRED_LINK_CLEANUP_BATCH).toBe(100);
    expect(links.deleteExpiredBefore).toHaveBeenCalledWith(
      new Date('2026-10-24T12:00:00.000Z'),
      100,
    );
  });

  it('o registro vence no mesmo instante que o JWT, mesmo com o envio no meio de um segundo', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-31T12:00:00.900Z') });
    const links = fakeLinks();
    const requester = fakeRequester();

    await createSendVerificationEmail(
      requester,
      links,
      options,
    )({
      user: { id: 'conta-6', email: 'ana@example.com' },
      token: 't',
    });

    const payload = await verifyJWT(sentToken(requester), SECRET);
    const expiresAt = links.create.mock.calls[0]?.[2];
    expect(expiresAt?.getTime()).toBe((payload?.exp ?? 0) * 1000);
    expect(expiresAt).toEqual(new Date('2026-11-01T12:00:00.000Z'));
  });

  it('não grava o token em texto puro', async () => {
    const links = fakeLinks();
    const requester = fakeRequester();
    await createSendVerificationEmail(
      requester,
      links,
      options,
    )({
      user: { id: 'conta-4', email: 'ana@example.com' },
      token: 'eyJ.token.secreto',
    });

    expect(JSON.stringify(links.create.mock.calls)).not.toContain(
      sentToken(requester),
    );
  });

  it('não pede o envio nem apaga registro quando a gravação do novo falha', async () => {
    const requester = fakeRequester();
    const links = fakeLinks({
      create: () => Promise.reject(new Error('banco fora')),
    });
    const send = createSendVerificationEmail(requester, links, options);

    await expect(
      send({ user: { id: 'c', email: 'c@example.com' }, token: 't' }),
    ).rejects.toThrow('banco fora');
    expect(requester.execute).not.toHaveBeenCalled();
    expect(links.deleteOlderForUser).not.toHaveBeenCalled();
    expect(links.deleteById).not.toHaveBeenCalled();
  });

  it('quando o pedido de envio falha, apaga só o registro novo e propaga a falha', async () => {
    const links = fakeLinks();
    const send = createSendVerificationEmail(
      { execute: () => Promise.reject(new Error('fila fora')) },
      links,
      options,
    );

    await expect(
      send({ user: { id: 'c', email: 'c@example.com' }, token: 't' }),
    ).rejects.toThrow('fila fora');
    expect(links.deleteById).toHaveBeenCalledWith('registro-novo');
    expect(links.deleteOlderForUser).not.toHaveBeenCalled();
  });

  it('quando a limpeza dos vencidos falha, não pede o envio e apaga o registro novo', async () => {
    const requester = fakeRequester();
    const links = fakeLinks({
      deleteExpiredBefore: () => Promise.reject(new Error('banco fora')),
    });

    await expect(
      createSendVerificationEmail(
        requester,
        links,
        options,
      )({ user: { id: 'c', email: 'c@example.com' }, token: 't' }),
    ).rejects.toThrow('banco fora');
    expect(requester.execute).not.toHaveBeenCalled();
    expect(links.deleteById).toHaveBeenCalledWith('registro-novo');
    expect(links.deleteOlderForUser).not.toHaveBeenCalled();
  });

  it('a falha ao desfazer o registro novo não esconde a falha do pedido', async () => {
    const links = fakeLinks({
      deleteById: () => Promise.reject(new Error('banco fora')),
    });

    await expect(
      createSendVerificationEmail(
        { execute: () => Promise.reject(new Error('fila fora')) },
        links,
        options,
      )({ user: { id: 'c', email: 'c@example.com' }, token: 't' }),
    ).rejects.toThrow('fila fora');
  });

  it('com o pedido na fila, a falha ao apagar os anteriores sobe e mantém o registro novo', async () => {
    const requester = fakeRequester();
    const links = fakeLinks({
      deleteOlderForUser: () => Promise.reject(new Error('banco fora')),
    });

    await expect(
      createSendVerificationEmail(
        requester,
        links,
        options,
      )({ user: { id: 'c', email: 'c@example.com' }, token: 't' }),
    ).rejects.toThrow('banco fora');
    expect(requester.execute).toHaveBeenCalledOnce();
    expect(links.deleteById).not.toHaveBeenCalled();
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

  it('codifica o token na query string', () => {
    expect(confirmEmailUrl('https://app.example', 'a+b/c=')).toBe(
      'https://app.example/confirmar-email?token=a%2Bb%2Fc%3D',
    );
  });
});
