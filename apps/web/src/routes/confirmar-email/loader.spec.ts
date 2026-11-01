import { verifyEmailMessages } from '@app/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shouldRevalidateVerifyEmail, verifyEmailLoader } from './loader.js';

function open(search: string) {
  return verifyEmailLoader({
    request: new Request(`http://web.test/confirmar-email${search}`),
  });
}

describe('verifyEmailLoader', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'http://api.test');
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('devolve o link que não vale sem token e sem chamar a API', async () => {
    await expect(open('')).resolves.toEqual({ state: 'invalid' });
    await expect(open('?token=')).resolves.toEqual({ state: 'invalid' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('confirma pelo token sem callbackURL e devolve a conta ativada no 200', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ status: true, user: null }, { status: 200 }),
    );

    await expect(open('?token=a.b%2Bc')).resolves.toEqual({
      state: 'verified',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('http://api.test/api/auth/verify-email?token=a.b%2Bc');
    expect(String(url)).not.toContain('callbackURL');
    expect(init).toEqual(expect.objectContaining({ credentials: 'include' }));
  });

  it('devolve a conta já confirmada com ALREADY_VERIFIED', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { status: true, code: 'ALREADY_VERIFIED' },
        { status: 200 },
      ),
    );

    await expect(open('?token=T1')).resolves.toEqual({
      state: 'alreadyVerified',
    });
  });

  it('devolve o link vencido com TOKEN_EXPIRED', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { code: 'TOKEN_EXPIRED', message: verifyEmailMessages.tokenExpired },
        { status: 401 },
      ),
    );

    await expect(open('?token=T1')).resolves.toEqual({ state: 'expired' });
  });

  it.each([
    ['INVALID_TOKEN', 401],
    ['USER_NOT_FOUND', 401],
    ['VALIDATION_ERROR', 400],
  ])('devolve o link que não vale com %s', async (code, status) => {
    fetchMock.mockResolvedValue(Response.json({ code }, { status }));

    await expect(open('?token=T1')).resolves.toEqual({ state: 'invalid' });
  });

  it('devolve o link que não vale com 4xx sem corpo JSON', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 401 }));

    await expect(open('?token=T1')).resolves.toEqual({ state: 'invalid' });
  });

  it('devolve servidor fora quando a rede falha', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(open('?token=T1')).resolves.toEqual({ state: 'unavailable' });
  });

  it('devolve servidor fora no 5xx', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    await expect(open('?token=T1')).resolves.toEqual({ state: 'unavailable' });
  });
});

describe('shouldRevalidateVerifyEmail', () => {
  const base = {
    currentUrl: new URL('http://web.test/confirmar-email?token=T1'),
    nextUrl: new URL('http://web.test/confirmar-email?token=T1'),
    currentParams: {},
    nextParams: {},
    defaultShouldRevalidate: true,
  };

  it('não refaz a confirmação depois da action do reenvio', () => {
    expect(
      shouldRevalidateVerifyEmail({
        ...base,
        formMethod: 'POST',
        actionStatus: 200,
      }),
    ).toBe(false);
  });

  it('segue o padrão do roteador fora de submissão', () => {
    expect(shouldRevalidateVerifyEmail(base)).toBe(true);
    expect(
      shouldRevalidateVerifyEmail({ ...base, defaultShouldRevalidate: false }),
    ).toBe(false);
  });
});
