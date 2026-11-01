import { signUpMessages } from '@app/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyEmailAction } from './action.js';

function submit(email: string | undefined) {
  const body = new FormData();
  if (email !== undefined) {
    body.set('email', email);
  }
  return verifyEmailAction({
    request: new Request('http://web.test/confirmar-email?token=T1', {
      method: 'POST',
      body,
    }),
  });
}

describe('verifyEmailAction', () => {
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

  it.each([['teo@'], [''], [undefined]])(
    'devolve o erro de campo sem chamar a API com %o',
    async (email) => {
      await expect(submit(email)).resolves.toEqual({
        status: 'invalid',
        error: signUpMessages.emailInvalid,
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('envia o reenvio com o e-mail normalizado e devolve o aviso genérico no 200', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ status: true }, { status: 200 }),
    );

    await expect(submit(' Teo@Example.com ')).resolves.toEqual({
      status: 'sent',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/auth/send-verification-email',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ email: 'teo@example.com' }),
      }),
    );
  });

  it('devolve limite excedido no 429', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 429 }));

    await expect(submit('teo@example.com')).resolves.toEqual({
      status: 'too-many',
    });
  });

  it('devolve o erro de campo no 400 da API', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ code: 'INVALID_EMAIL' }, { status: 400 }),
    );

    await expect(submit('teo@example.com')).resolves.toEqual({
      status: 'invalid',
      error: signUpMessages.emailInvalid,
    });
  });

  it('devolve servidor fora quando a rede falha', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(submit('teo@example.com')).resolves.toEqual({
      status: 'unavailable',
    });
  });

  it('devolve servidor fora no 5xx', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    await expect(submit('teo@example.com')).resolves.toEqual({
      status: 'unavailable',
    });
  });
});
