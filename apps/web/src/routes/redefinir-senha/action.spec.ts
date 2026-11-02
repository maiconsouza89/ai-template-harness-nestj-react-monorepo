import { resetPasswordMessages } from '@app/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetPasswordAction } from './action.js';

const rule =
  'A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número.';

function submit(
  fields: { newPassword?: string; confirmPassword?: string },
  search = '?token=T1',
) {
  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    if (value !== undefined) {
      body.set(name, value);
    }
  }
  return resetPasswordAction({
    request: new Request(`http://web.test/redefinir-senha${search}`, {
      method: 'POST',
      body,
    }),
  });
}

const valid = { newPassword: 'Nova12345', confirmPassword: 'Nova12345' };

describe('resetPasswordAction', () => {
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

  it('devolve "As senhas não conferem." no campo de confirmação sem chamar a API', async () => {
    await expect(
      submit({ newPassword: 'Nova12345', confirmPassword: 'Nova54321' }),
    ).resolves.toEqual({
      status: 'invalid',
      fieldErrors: { confirmPassword: resetPasswordMessages.passwordMismatch },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([['semnumero'], ['12345678'], ['Nova123'], ['']])(
    'devolve a regra no campo da nova senha sem chamar a API com %o',
    async (password) => {
      const result = await submit({
        newPassword: password,
        confirmPassword: password,
      });
      expect(result).toEqual({
        status: 'invalid',
        fieldErrors: expect.objectContaining({ newPassword: rule }),
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('devolve o link que não vale sem token e sem chamar a API', async () => {
    await expect(submit(valid, '')).resolves.toEqual({
      status: 'invalid-token',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('envia o token da URL e a nova senha e devolve senha alterada no 200', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ status: true }, { status: 200 }),
    );

    await expect(submit(valid, '?token=a.b%2Bc')).resolves.toEqual({
      status: 'changed',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/auth/reset-password',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ token: 'a.b+c', newPassword: 'Nova12345' }),
      }),
    );
  });

  it.each([['INVALID_TOKEN'], ['USER_NOT_FOUND']])(
    'devolve o link que não vale no 400 %s',
    async (code) => {
      fetchMock.mockResolvedValue(
        Response.json({ code, message: 'Invalid token' }, { status: 400 }),
      );

      await expect(submit(valid)).resolves.toEqual({
        status: 'invalid-token',
      });
    },
  );

  it('devolve o erro de campo no 400 VALIDATION_ERROR da API', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Confira os campos destacados.',
          fields: [{ field: 'newPassword', message: rule }],
        },
        { status: 400 },
      ),
    );

    await expect(submit(valid)).resolves.toEqual({
      status: 'invalid',
      fieldErrors: { newPassword: rule },
    });
  });

  it('devolve limite excedido no 429', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 429 }));

    await expect(submit(valid)).resolves.toEqual({ status: 'too-many' });
  });

  it('devolve servidor fora quando a rede falha', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(submit(valid)).resolves.toEqual({ status: 'unavailable' });
  });

  it('devolve servidor fora no 5xx', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    await expect(submit(valid)).resolves.toEqual({ status: 'unavailable' });
  });
});
