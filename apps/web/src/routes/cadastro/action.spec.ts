import { signUpMessages } from '@app/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signUpAction } from './action.js';

function submit(fields: Record<string, string>) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    body.set(key, value);
  }
  return signUpAction({
    request: new Request('http://web.test/cadastro', { method: 'POST', body }),
  });
}

const valid = {
  intent: 'sign-up',
  name: 'Ana Souza',
  email: 'Ana@Example.com',
  password: 'Segura123',
};

describe('signUpAction', () => {
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

  it('devolve os erros por campo sem chamar a API', async () => {
    const result = await submit({
      intent: 'sign-up',
      name: '   ',
      email: 'yara@',
      password: 'abcdefgh',
    });

    expect(result).toEqual({
      intent: 'sign-up',
      status: 'invalid',
      fieldErrors: {
        name: signUpMessages.nameRequired,
        email: signUpMessages.emailInvalid,
        password: signUpMessages.passwordRule,
      },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('chama o cadastro com o corpo em JSON e devolve o link enviado no 200', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ token: null }, { status: 200 }),
    );

    const result = await submit(valid);

    expect(result).toEqual({
      intent: 'sign-up',
      status: 'sent',
      email: 'ana@example.com',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/auth/sign-up/email',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    const init = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(init?.body))).toEqual({
      name: 'Ana Souza',
      email: 'ana@example.com',
      password: 'Segura123',
    });
  });

  it('devolve e-mail existente no 422', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ code: 'USER_ALREADY_EXISTS' }, { status: 422 }),
    );

    await expect(submit(valid)).resolves.toEqual({
      intent: 'sign-up',
      status: 'exists',
    });
  });

  it('devolve os campos recusados pela API no 400', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Confira os campos destacados.',
          fields: [{ field: 'password', message: signUpMessages.passwordRule }],
        },
        { status: 400 },
      ),
    );

    await expect(submit(valid)).resolves.toEqual({
      intent: 'sign-up',
      status: 'invalid',
      fieldErrors: { password: signUpMessages.passwordRule },
    });
  });

  it('devolve limite excedido no 429', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 429 }));

    await expect(submit(valid)).resolves.toEqual({
      intent: 'sign-up',
      status: 'too-many',
    });
  });

  it('devolve servidor fora quando a rede falha', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(submit(valid)).resolves.toEqual({
      intent: 'sign-up',
      status: 'unavailable',
    });
  });

  it('reenvia o link pelo e-mail do cadastro', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ status: true }, { status: 200 }),
    );

    const result = await submit({
      intent: 'resend',
      email: 'vera@example.com',
    });

    expect(result).toEqual({ intent: 'resend', status: 'resent' });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/auth/send-verification-email',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'vera@example.com' }),
      }),
    );
  });
});
