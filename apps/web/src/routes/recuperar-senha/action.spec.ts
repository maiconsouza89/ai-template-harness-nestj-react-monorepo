import { signUpMessages } from '@app/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestPasswordResetAction } from './action.js';

function submit(email: string | undefined) {
  const body = new FormData();
  if (email !== undefined) {
    body.set('email', email);
  }
  return requestPasswordResetAction({
    request: new Request('http://web.test/recuperar-senha', {
      method: 'POST',
      body,
    }),
  });
}

describe('requestPasswordResetAction', () => {
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

  it.each([['abc'], ['rosa@'], [''], [undefined]])(
    'devolve o erro de campo sem chamar a API com %o',
    async (email) => {
      await expect(submit(email)).resolves.toEqual({
        status: 'invalid',
        error: signUpMessages.emailInvalid,
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('envia o pedido com o e-mail normalizado e devolve o aviso neutro no 200', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          status: true,
          message:
            'If this email exists in our system, check your email for the reset link',
        },
        { status: 200 },
      ),
    );

    await expect(submit(' Rosa@Example.com ')).resolves.toEqual({
      status: 'sent',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/auth/request-password-reset',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ email: 'rosa@example.com' }),
      }),
    );
  });

  it('não manda redirectTo: o link do e-mail é montado pela API', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ status: true }, { status: 200 }),
    );

    await submit('rosa@example.com');

    const init = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(init?.body))).toEqual({
      email: 'rosa@example.com',
    });
  });

  it('devolve limite excedido no 429', async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 429, headers: { 'X-Retry-After': '42' } }),
    );

    await expect(submit('rosa@example.com')).resolves.toEqual({
      status: 'too-many',
    });
  });

  it('devolve o erro de campo no 400 da API', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ code: 'INVALID_EMAIL' }, { status: 400 }),
    );

    await expect(submit('rosa@example.com')).resolves.toEqual({
      status: 'invalid',
      error: signUpMessages.emailInvalid,
    });
  });

  it('devolve servidor fora quando a rede falha', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(submit('rosa@example.com')).resolves.toEqual({
      status: 'unavailable',
    });
  });

  it('devolve servidor fora no 5xx', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    await expect(submit('rosa@example.com')).resolves.toEqual({
      status: 'unavailable',
    });
  });
});
