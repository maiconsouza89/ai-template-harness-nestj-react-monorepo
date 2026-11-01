import { createHash } from 'node:crypto';
import { verifyEmailMessages } from '@app/contracts';
import { isAPIError } from 'better-auth/api';
import type { EmailVerificationLink } from '../../domain/email-verification-links.js';
import {
  checkVerifyEmail,
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
    deleted?: boolean;
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
    deleteById: vi.fn((_id: string) =>
      Promise.resolve(overrides.deleted ?? true),
    ),
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

  it('com registro vigente de conta pendente, apaga o registro e deixa seguir', async () => {
    const { value, links } = input();

    await expect(checkVerifyEmail(value)).resolves.toBeUndefined();
    expect(links.findByTokenHash).toHaveBeenCalledWith(TOKEN_HASH);
    expect(links.deleteById).toHaveBeenCalledWith('registro-1');
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

  it('registro que outro pedido apagou: relê a conta e responde ALREADY_VERIFIED se ela já está ativa', async () => {
    const { value, findUserById } = input({
      deleted: false,
      accounts: [pending, active],
    });

    await expect(checkVerifyEmail(value)).resolves.toEqual({
      status: true,
      code: 'ALREADY_VERIFIED',
    });
    expect(findUserById).toHaveBeenCalledTimes(2);
  });

  it('registro que outro pedido apagou: recusa com INVALID_TOKEN se a conta segue pendente', async () => {
    const { value } = input({ deleted: false, accounts: [pending, pending] });

    const error = await rejection(checkVerifyEmail(value));
    expect(error.body).toMatchObject({ code: 'INVALID_TOKEN' });
  });

  it('nenhuma recusa ecoa o token', async () => {
    const { value } = input({ link: null });
    const error = await rejection(checkVerifyEmail(value));
    expect(JSON.stringify(error.body)).not.toContain(TOKEN);
  });
});
