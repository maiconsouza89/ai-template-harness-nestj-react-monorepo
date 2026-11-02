import { createHash } from 'node:crypto';
import type { EmailRequest } from '../../../email/email.module.js';
import {
  createSendResetPassword,
  type PasswordResetLinkCleaner,
  resetPasswordUrl,
} from './send-reset-password.js';

const options = { webOrigin: 'http://localhost:5173' };
// Token falso com a forma do Better Auth (24 alfanuméricos), de baixa entropia para o gitleaks.
const TOKEN = 'Ab1'.repeat(8);
const NOW = new Date('2026-11-01T12:00:00.000Z');

const created = {
  id: 'registro-novo',
  userId: 'conta-1',
  expiresAt: new Date('2026-11-01T13:00:00.000Z'),
  createdAt: NOW,
};

/** Porta dublê; registra em `order` cada chamada, junto com as do pedido de envio. */
function fakeLinks(
  overrides: Partial<PasswordResetLinkCleaner> = {},
  order: string[] = [],
) {
  return {
    findByIdentifier: vi.fn<PasswordResetLinkCleaner['findByIdentifier']>(
      (identifier) => {
        order.push('findByIdentifier');
        return (
          overrides.findByIdentifier?.(identifier) ?? Promise.resolve(created)
        );
      },
    ),
    deleteExpired: vi.fn<PasswordResetLinkCleaner['deleteExpired']>((now) => {
      order.push('deleteExpired');
      return overrides.deleteExpired?.(now) ?? Promise.resolve(0);
    }),
    deleteOlderForUser: vi.fn<PasswordResetLinkCleaner['deleteOlderForUser']>(
      (link) => {
        order.push('deleteOlderForUser');
        return overrides.deleteOlderForUser?.(link) ?? Promise.resolve(1);
      },
    ),
    deleteById: vi.fn<PasswordResetLinkCleaner['deleteById']>((id) => {
      order.push('deleteById');
      return overrides.deleteById?.(id) ?? Promise.resolve(true);
    }),
  };
}

function fakeRequester(order: string[] = []) {
  return {
    execute: vi.fn<(request: EmailRequest) => Promise<void>>(() => {
      order.push('request');
      return Promise.resolve();
    }),
  };
}

const data = {
  user: { id: 'conta-1', email: 'rosa@example.com', name: 'Rosa Lima' },
  token: TOKEN,
  url: `http://localhost:3000/api/auth/reset-password/${TOKEN}?callbackURL=`,
};

describe('createSendResetPassword', () => {
  it('pede o envio do tipo reset-password com o link da SPA em /redefinir-senha', async () => {
    const requester = fakeRequester();
    const log = vi.fn();

    await createSendResetPassword(requester, fakeLinks(), options, log)(data);

    expect(requester.execute).toHaveBeenCalledWith({
      type: 'reset-password',
      userId: 'conta-1',
      url: `http://localhost:5173/redefinir-senha?token=${TOKEN}`,
    });
    expect(log).not.toHaveBeenCalled();
  });

  it('acha o registro novo pelo hash do identificador com prefixo, nunca pelo token', async () => {
    const links = fakeLinks();

    await createSendResetPassword(
      fakeRequester(),
      links,
      options,
      vi.fn(),
    )(data);

    expect(links.findByIdentifier).toHaveBeenCalledWith(
      `reset-password:${createHash('sha256').update(TOKEN).digest('hex')}`,
    );
    expect(JSON.stringify(links.findByIdentifier.mock.calls)).not.toContain(
      TOKEN,
    );
  });

  it('limpa os vencidos, pede o envio e só então apaga os anteriores da conta', async () => {
    const order: string[] = [];
    const links = fakeLinks({}, order);

    await createSendResetPassword(
      fakeRequester(order),
      links,
      options,
      vi.fn(),
      () => NOW,
    )(data);

    expect(order).toEqual([
      'findByIdentifier',
      'deleteExpired',
      'request',
      'deleteOlderForUser',
    ]);
    expect(links.deleteExpired).toHaveBeenCalledWith(NOW);
    expect(links.deleteOlderForUser).toHaveBeenCalledWith(created);
    expect(links.deleteById).not.toHaveBeenCalled();
  });

  it('com falha no pedido, apaga só o registro novo, registra a falha e resolve sem erro', async () => {
    const links = fakeLinks();
    const log = vi.fn();
    const error = Object.assign(new Error(`fila fora ${TOKEN}`), {
      code: 'ECONNREFUSED',
    });

    await expect(
      createSendResetPassword(
        { execute: () => Promise.reject(error) },
        links,
        options,
        log,
      )(data),
    ).resolves.toBeUndefined();

    expect(links.deleteById).toHaveBeenCalledWith('registro-novo');
    expect(links.deleteOlderForUser).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls[0]?.[0]).toContain('Error (ECONNREFUSED)');
  });

  it('com falha na limpeza dos vencidos, não pede o envio, desfaz o registro novo e resolve', async () => {
    const requester = fakeRequester();
    const links = fakeLinks({
      deleteExpired: () => Promise.reject(new Error('banco fora')),
    });
    const log = vi.fn();

    await expect(
      createSendResetPassword(requester, links, options, log)(data),
    ).resolves.toBeUndefined();

    expect(requester.execute).not.toHaveBeenCalled();
    expect(links.deleteById).toHaveBeenCalledWith('registro-novo');
    expect(links.deleteOlderForUser).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledOnce();
  });

  it('a falha ao desfazer o registro novo também não sobe', async () => {
    const log = vi.fn();

    await expect(
      createSendResetPassword(
        { execute: () => Promise.reject(new Error('fila fora')) },
        fakeLinks({ deleteById: () => Promise.reject(new Error('banco')) }),
        options,
        log,
      )(data),
    ).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledOnce();
  });

  it('com o pedido na fila, a falha ao apagar os anteriores vai para o log e mantém o registro novo', async () => {
    const requester = fakeRequester();
    const links = fakeLinks({
      deleteOlderForUser: () => Promise.reject(new Error('banco fora')),
    });
    const log = vi.fn();

    await expect(
      createSendResetPassword(requester, links, options, log)(data),
    ).resolves.toBeUndefined();

    expect(requester.execute).toHaveBeenCalledOnce();
    expect(links.deleteById).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledOnce();
  });

  it('sem o registro novo, não pede o envio nem apaga nada', async () => {
    const requester = fakeRequester();
    const links = fakeLinks({ findByIdentifier: () => Promise.resolve(null) });
    const log = vi.fn();

    await expect(
      createSendResetPassword(requester, links, options, log)(data),
    ).resolves.toBeUndefined();

    expect(requester.execute).not.toHaveBeenCalled();
    expect(links.deleteExpired).not.toHaveBeenCalled();
    expect(links.deleteById).not.toHaveBeenCalled();
    expect(links.deleteOlderForUser).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledOnce();
  });

  it('com falha na leitura do registro novo, registra a falha e resolve', async () => {
    const requester = fakeRequester();
    const log = vi.fn();

    await expect(
      createSendResetPassword(
        requester,
        fakeLinks({
          findByIdentifier: () => Promise.reject(new Error('banco fora')),
        }),
        options,
        log,
      )(data),
    ).resolves.toBeUndefined();

    expect(requester.execute).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledOnce();
  });

  it('não leva nome, e-mail nem token ao log, e nome nem e-mail ao pedido', async () => {
    const order: string[] = [];
    const requester = fakeRequester(order);
    const log = vi.fn();
    const failing = fakeLinks({
      deleteOlderForUser: () =>
        Promise.reject(new Error(`rosa@example.com Rosa Lima ${TOKEN}`)),
    });

    await createSendResetPassword(requester, failing, options, log)(data);
    await createSendResetPassword(
      { execute: () => Promise.reject(new Error(`rosa@example.com ${TOKEN}`)) },
      fakeLinks(),
      options,
      log,
    )(data);

    const logged = JSON.stringify(log.mock.calls);
    for (const secret of ['rosa@example.com', 'Rosa Lima', TOKEN]) {
      expect(logged).not.toContain(secret);
    }
    const sent = JSON.stringify(requester.execute.mock.calls[0]?.[0]);
    expect(sent).not.toContain('rosa@example.com');
    expect(sent).not.toContain('Rosa Lima');
  });

  it('codifica o token na query string', () => {
    expect(resetPasswordUrl('https://app.example', 'a+b/c=')).toBe(
      'https://app.example/redefinir-senha?token=a%2Bb%2Fc%3D',
    );
  });
});
