import { createHash } from 'node:crypto';
import { verifyEmailMessages } from '@app/contracts';
import { APIError, isAPIError } from 'better-auth/api';
import type { EmailVerificationLink } from '../../domain/email-verification-links.js';
import {
  checkVerifyEmail,
  consumeVerifyEmailLink,
  VERIFY_EMAIL_PATH,
  type VerifyEmailAccount,
  type VerifyEmailCheckInput,
} from './verify-email.plugin.js';

const NOW = new Date('2026-10-31T12:00:00.000Z');
const TOKEN = 'eyJ.token.do-link';
const TOKEN_HASH = createHash('sha256').update(TOKEN).digest('hex');

const pending: VerifyEmailAccount = { emailVerified: false };
const active: VerifyEmailAccount = { emailVerified: true };

function link(expiresAt = new Date('2026-11-01T11:00:00.000Z')) {
  return { id: 'registro-1', userId: 'conta-1', expiresAt };
}

/** Entrada com a porta e as buscas como dublês; cada caso troca só o que importa. */
function input(
  overrides: {
    link?: EmailVerificationLink | null;
    accounts?: (VerifyEmailAccount | null)[];
    byEmail?: VerifyEmailAccount | null;
    payload?: { email?: unknown } | null;
    token?: unknown;
    path?: string;
  } = {},
) {
  const accounts = [...(overrides.accounts ?? [pending])];
  const links = {
    findByTokenHash: vi.fn((_hash: string) =>
      Promise.resolve(overrides.link === undefined ? link() : overrides.link),
    ),
    deleteById: vi.fn((_id: string) => Promise.resolve(true)),
  };
  const findUserById = vi.fn((_id: string) =>
    Promise.resolve(accounts.length > 1 ? accounts.shift()! : accounts[0]!),
  );
  const findUserByEmail = vi.fn((_email: string) =>
    Promise.resolve(overrides.byEmail ?? null),
  );
  const verifyToken = vi.fn((_token: string) =>
    Promise.resolve(overrides.payload ?? null),
  );
  const value: VerifyEmailCheckInput = {
    path: overrides.path ?? VERIFY_EMAIL_PATH,
    token: 'token' in overrides ? overrides.token : TOKEN,
    links,
    findUserById,
    findUserByEmail,
    verifyToken,
    now: () => NOW,
  };
  return { value, links, findUserById, findUserByEmail, verifyToken };
}

async function rejection(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (isAPIError(error)) return error;
    throw error;
  }
  throw new Error('esperava a recusa da confirmação');
}

describe('checkVerifyEmail (hook antes da confirmação)', () => {
  it('ignora os outros caminhos sem consultar os registros', async () => {
    const { value, links } = input({ path: '/sign-up/email' });
    await expect(checkVerifyEmail(value)).resolves.toBeUndefined();
    expect(links.findByTokenHash).not.toHaveBeenCalled();
  });

  it('com registro vigente de conta pendente, deixa seguir sem apagar o registro', async () => {
    const { value, links, findUserById } = input();

    await expect(checkVerifyEmail(value)).resolves.toBeUndefined();
    expect(links.findByTokenHash).toHaveBeenCalledWith(TOKEN_HASH);
    expect(findUserById).toHaveBeenCalledWith('conta-1');
    expect(links.deleteById).not.toHaveBeenCalled();
  });

  it('com registro vencido, recusa com 401 TOKEN_EXPIRED sem apagar', async () => {
    const { value, links } = input({ link: link(NOW) });

    const error = await rejection(checkVerifyEmail(value));
    expect(error.statusCode).toBe(401);
    expect(error.body).toMatchObject({
      code: 'TOKEN_EXPIRED',
      message: verifyEmailMessages.tokenExpired,
    });
    expect(links.deleteById).not.toHaveBeenCalled();
  });

  it('com registro de conta já ativa, apaga e responde ALREADY_VERIFIED', async () => {
    const { value, links } = input({ accounts: [active] });

    await expect(checkVerifyEmail(value)).resolves.toEqual({
      status: true,
      code: 'ALREADY_VERIFIED',
    });
    expect(links.deleteById).toHaveBeenCalledWith('registro-1');
  });

  it('com registro de conta que não existe mais, recusa com INVALID_TOKEN', async () => {
    const { value, links } = input({ accounts: [null] });

    const error = await rejection(checkVerifyEmail(value));
    expect(error.statusCode).toBe(401);
    expect(error.body).toMatchObject({
      code: 'INVALID_TOKEN',
      message: verifyEmailMessages.invalidToken,
    });
    expect(links.deleteById).not.toHaveBeenCalled();
  });

  it('sem registro, recusa com INVALID_TOKEN', async () => {
    const { value, findUserByEmail } = input({ link: null, payload: null });

    const error = await rejection(checkVerifyEmail(value));
    expect(error.statusCode).toBe(401);
    expect(error.body).toMatchObject({ code: 'INVALID_TOKEN' });
    expect(findUserByEmail).not.toHaveBeenCalled();
  });

  it('sem registro, com JWT válido de conta ativa, responde ALREADY_VERIFIED', async () => {
    const { value, verifyToken, findUserByEmail } = input({
      link: null,
      payload: { email: 'leo@example.com' },
      byEmail: active,
    });

    await expect(checkVerifyEmail(value)).resolves.toEqual({
      status: true,
      code: 'ALREADY_VERIFIED',
    });
    expect(verifyToken).toHaveBeenCalledWith(TOKEN);
    expect(findUserByEmail).toHaveBeenCalledWith('leo@example.com');
  });

  it('sem registro, com JWT válido de conta pendente, recusa com INVALID_TOKEN', async () => {
    const { value } = input({
      link: null,
      payload: { email: 'luna@example.com' },
      byEmail: pending,
    });

    const error = await rejection(checkVerifyEmail(value));
    expect(error.body).toMatchObject({ code: 'INVALID_TOKEN' });
  });

  it('sem token, recusa com INVALID_TOKEN sem consultar os registros', async () => {
    const { value, links } = input({ token: undefined });

    const error = await rejection(checkVerifyEmail(value));
    expect(error.statusCode).toBe(401);
    expect(error.body).toMatchObject({ code: 'INVALID_TOKEN' });
    expect(links.findByTokenHash).not.toHaveBeenCalled();
  });

  it('nenhuma recusa ecoa o token', async () => {
    const { value } = input({ link: null });
    const error = await rejection(checkVerifyEmail(value));
    expect(JSON.stringify(error.body)).not.toContain(TOKEN);
  });
});

/** Consumo com a porta dublê, que acha o registro salvo com `found` falso. */
function consume(
  returned: unknown,
  overrides: { path?: string; token?: unknown; found?: boolean } = {},
) {
  const links = {
    findByTokenHash: vi.fn((_hash: string) =>
      Promise.resolve(overrides.found === false ? null : link()),
    ),
    deleteById: vi.fn((_id: string) => Promise.resolve(true)),
  };
  const result = consumeVerifyEmailLink({
    path: overrides.path ?? VERIFY_EMAIL_PATH,
    token: 'token' in overrides ? overrides.token : TOKEN,
    returned,
    links,
  });
  return { result, links };
}

describe('consumeVerifyEmailLink (hook depois da confirmação)', () => {
  it('apaga o registro quando a biblioteca responde sem erro', async () => {
    const { result, links } = consume({ status: true, user: null });

    await expect(result).resolves.toBe(true);
    expect(links.findByTokenHash).toHaveBeenCalledWith(TOKEN_HASH);
    expect(links.deleteById).toHaveBeenCalledWith('registro-1');
  });

  it('mantém o registro quando a biblioteca recusa com APIError', async () => {
    const { result, links } = consume(
      new APIError('UNAUTHORIZED', { code: 'USER_NOT_FOUND' }),
    );

    await expect(result).resolves.toBe(false);
    expect(links.findByTokenHash).not.toHaveBeenCalled();
    expect(links.deleteById).not.toHaveBeenCalled();
  });

  it('mantém o registro no redirecionamento de callbackURL, que também é APIError', async () => {
    const { result, links } = consume(
      new APIError('FOUND', undefined, { location: '/x' }),
    );

    await expect(result).resolves.toBe(false);
    expect(links.deleteById).not.toHaveBeenCalled();
  });

  it('mantém o registro sem resposta ou com outro erro', async () => {
    for (const returned of [undefined, new Error('banco fora')]) {
      const { result, links } = consume(returned);
      await expect(result).resolves.toBe(false);
      expect(links.deleteById).not.toHaveBeenCalled();
    }
  });

  it('não faz nada fora de /verify-email nem sem token', async () => {
    for (const overrides of [
      { path: '/sign-up/email' },
      { token: undefined },
    ]) {
      const { result, links } = consume({ status: true }, overrides);
      await expect(result).resolves.toBe(false);
      expect(links.findByTokenHash).not.toHaveBeenCalled();
    }
  });

  it('sem registro (o outro pedido simultâneo já apagou), não falha', async () => {
    const { result, links } = consume(
      { status: true, user: null },
      { found: false },
    );

    await expect(result).resolves.toBe(false);
    expect(links.deleteById).not.toHaveBeenCalled();
  });
});
