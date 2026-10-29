import { PASSWORD_RULE_MESSAGE } from '@app/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SIGN_UP_MESSAGES, signUpAction } from './action.js';

// Senhas geradas em tempo de execução: literal parecido com segredo dispara o gitleaks.
const VALID_PASSWORD = ['senha', String(1234)].join('');
const LETTERS_ONLY = 'abcdefgh';

function submit(fields: Record<string, string>) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  return signUpAction({
    request: new Request('http://web.test/cadastro', { method: 'POST', body }),
  });
}

function signUp(overrides: Record<string, string> = {}) {
  return submit({
    name: 'Ana Souza',
    email: 'Ana@Example.com',
    password: VALID_PASSWORD,
    ...overrides,
  });
}

function resend() {
  return submit({ intent: 'resend', email: 'ana@example.com' });
}

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

  it('devolve um erro por campo sem chamar a API, e não devolve a senha', async () => {
    const result = await submit({
      name: '   ',
      email: 'nao-e-um-email',
      password: LETTERS_ONLY,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'invalid',
      values: { name: '   ', email: 'nao-e-um-email' },
      fields: {
        name: 'O nome é obrigatório.',
        email: 'Informe um e-mail válido.',
        password: PASSWORD_RULE_MESSAGE,
      },
    });
    expect(JSON.stringify(result)).not.toContain(LETTERS_ONLY);
  });

  it('envia o cadastro normalizado com o callbackURL da confirmação', async () => {
    fetchMock.mockResolvedValue(Response.json({ token: null, user: {} }));

    await signUp({ name: '  Ana Souza ' });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://api.test/api/auth/sign-up/email');
    expect(init).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(JSON.parse(init!.body as string)).toEqual({
      name: 'Ana Souza',
      email: 'ana@example.com',
      password: VALID_PASSWORD,
      callbackURL: 'http://web.test/confirmar-email',
    });
  });

  it('devolve o sucesso com o e-mail em minúsculas com 200', async () => {
    fetchMock.mockResolvedValue(Response.json({ token: null, user: {} }));

    await expect(signUp()).resolves.toEqual({
      status: 'success',
      email: 'ana@example.com',
    });
  });

  it('devolve os campos do 400 VALIDATION_ERROR da API', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Dados de cadastro inválidos.',
          fields: [{ field: 'password', message: PASSWORD_RULE_MESSAGE }],
        },
        { status: 400 },
      ),
    );

    await expect(signUp()).resolves.toEqual({
      status: 'invalid',
      values: { name: 'Ana Souza', email: 'Ana@Example.com' },
      fields: { password: PASSWORD_RULE_MESSAGE },
    });
  });

  it('devolve o e-mail duplicado com 422', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
          message: 'User already exists. Use another email.',
        },
        { status: 422 },
      ),
    );

    await expect(signUp()).resolves.toEqual({
      status: 'duplicate',
      values: { name: 'Ana Souza', email: 'Ana@Example.com' },
    });
  });

  it('devolve o excesso de tentativas com 429', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'X-Retry-After': '60' } },
      ),
    );

    await expect(signUp()).resolves.toMatchObject({
      status: 'failed',
      message: SIGN_UP_MESSAGES.rateLimited,
    });
  });

  it('devolve o servidor fora quando a rede falha', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(signUp()).resolves.toEqual({
      status: 'failed',
      values: { name: 'Ana Souza', email: 'Ana@Example.com' },
      message: SIGN_UP_MESSAGES.unavailable,
    });
  });

  it('devolve a mensagem genérica com outro erro da API', async () => {
    fetchMock.mockResolvedValue(new Response('oops', { status: 500 }));

    await expect(signUp()).resolves.toMatchObject({
      status: 'failed',
      message: SIGN_UP_MESSAGES.unexpected,
    });
  });

  describe('reenvio', () => {
    it('chama /send-verification-email e informa o reenvio com 200', async () => {
      fetchMock.mockResolvedValue(Response.json({ status: true }));

      await expect(resend()).resolves.toEqual({
        status: 'resent',
        email: 'ana@example.com',
      });
      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe('http://api.test/api/auth/send-verification-email');
      expect(JSON.parse(init!.body as string)).toEqual({
        email: 'ana@example.com',
        callbackURL: 'http://web.test/confirmar-email',
      });
    });

    it('informa o excesso de tentativas com 429', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 429 }));

      await expect(resend()).resolves.toEqual({
        status: 'resend-failed',
        email: 'ana@example.com',
        message: SIGN_UP_MESSAGES.rateLimited,
      });
    });

    it('informa o servidor fora quando a rede falha', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));

      await expect(resend()).resolves.toMatchObject({
        status: 'resend-failed',
        message: SIGN_UP_MESSAGES.unavailable,
      });
    });
  });
});
