import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resetPasswordLoader,
  shouldRevalidateResetPassword,
} from './loader.js';

function open(search: string) {
  return resetPasswordLoader({
    request: new Request(`http://web.test/redefinir-senha${search}`),
  });
}

describe('resetPasswordLoader', () => {
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

  it('checa o link pelo token e devolve o formulário no 200', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ valid: true }, { status: 200 }),
    );

    await expect(open('?token=a.b%2Bc')).resolves.toEqual({ state: 'form' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(
      'http://api.test/api/auth/reset-password-status?token=a.b%2Bc',
    );
    expect(init).toEqual(expect.objectContaining({ credentials: 'include' }));
    expect(init?.method).toBeUndefined();
  });

  it.each([
    ['INVALID_TOKEN', 400],
    ['USER_NOT_FOUND', 400],
    ['VALIDATION_ERROR', 400],
  ])('devolve o link que não vale com %s', async (code, status) => {
    fetchMock.mockResolvedValue(Response.json({ code }, { status }));

    await expect(open('?token=T1')).resolves.toEqual({ state: 'invalid' });
  });

  it('devolve o link que não vale com 4xx sem corpo JSON', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 400 }));

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

describe('shouldRevalidateResetPassword', () => {
  const base = {
    currentUrl: new URL('http://web.test/redefinir-senha?token=T1'),
    nextUrl: new URL('http://web.test/redefinir-senha?token=T1'),
    currentParams: {},
    nextParams: {},
    defaultShouldRevalidate: true,
  };

  it('não refaz a checagem depois da action da troca', () => {
    expect(
      shouldRevalidateResetPassword({
        ...base,
        formMethod: 'POST',
        actionStatus: 200,
      }),
    ).toBe(false);
  });

  it('segue o padrão do roteador fora de submissão', () => {
    expect(shouldRevalidateResetPassword(base)).toBe(true);
    expect(
      shouldRevalidateResetPassword({
        ...base,
        defaultShouldRevalidate: false,
      }),
    ).toBe(false);
  });
});
