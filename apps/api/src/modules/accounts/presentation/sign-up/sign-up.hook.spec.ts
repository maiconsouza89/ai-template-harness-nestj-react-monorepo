import { signUpMessages } from '@app/contracts';
import { isAPIError } from 'better-auth/api';
import {
  checkSignUp,
  SIGN_UP_PATH,
  stripSignUpRedirects,
} from './sign-up.hook.js';

const validBody = {
  name: '  Ana Souza ',
  email: 'Ana@Example.com',
  password: 'Segura123',
};

async function rejection(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (isAPIError(error)) return error;
    throw error;
  }
  throw new Error('esperava a recusa do cadastro');
}

describe('checkSignUp (hook antes do cadastro)', () => {
  it('ignora os outros caminhos sem consultar a conta', async () => {
    const findUserByEmail = vi.fn();
    await expect(
      checkSignUp({ path: '/sign-in/email', body: {}, findUserByEmail }),
    ).resolves.toBeUndefined();
    expect(findUserByEmail).not.toHaveBeenCalled();
  });

  it('devolve o corpo normalizado quando o e-mail é novo', async () => {
    const findUserByEmail = vi.fn().mockResolvedValue(null);
    await expect(
      checkSignUp({ path: SIGN_UP_PATH, body: validBody, findUserByEmail }),
    ).resolves.toEqual({
      name: 'Ana Souza',
      email: 'ana@example.com',
      password: 'Segura123',
    });
  });

  it('recusa com 400 VALIDATION_ERROR e um item por campo, sem consultar a conta', async () => {
    const findUserByEmail = vi.fn();
    const error = await rejection(
      checkSignUp({
        path: SIGN_UP_PATH,
        body: { name: '   ', email: 'joana@', password: 'SenhaSegura' },
        findUserByEmail,
      }),
    );

    expect(error.statusCode).toBe(400);
    expect(error.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Confira os campos destacados.',
      fields: [
        { field: 'name', message: signUpMessages.nameRequired },
        { field: 'email', message: signUpMessages.emailInvalid },
        { field: 'password', message: signUpMessages.passwordRule },
      ],
    });
    expect(findUserByEmail).not.toHaveBeenCalled();
  });

  it('recusa corpo ausente apontando os três campos', async () => {
    const error = await rejection(
      checkSignUp({
        path: SIGN_UP_PATH,
        body: undefined,
        findUserByEmail: vi.fn(),
      }),
    );
    expect(error.statusCode).toBe(400);
    expect(
      (error.body as { fields: { field: string }[] }).fields.map(
        ({ field }) => field,
      ),
    ).toEqual(['name', 'email', 'password']);
  });

  it('recusa com 422 USER_ALREADY_EXISTS quando acha a conta pelo e-mail em minúsculas', async () => {
    const findUserByEmail = vi
      .fn()
      .mockResolvedValue({ user: { id: 'u1' }, accounts: [] });
    const error = await rejection(
      checkSignUp({ path: SIGN_UP_PATH, body: validBody, findUserByEmail }),
    );

    expect(findUserByEmail).toHaveBeenCalledWith('ana@example.com');
    expect(error.statusCode).toBe(422);
    expect(error.body).toMatchObject({ code: 'USER_ALREADY_EXISTS' });
    expect(JSON.stringify(error.body)).not.toContain('ana@example.com');
  });

  it.each([['admin@example.com'], ['ADMIN@Example.COM']])(
    'recusa o e-mail reservado ao admin (%s) com o mesmo 422 de e-mail existente, sem consultar a conta',
    async (email) => {
      const findUserByEmail = vi.fn().mockResolvedValue(null);
      const error = await rejection(
        checkSignUp({
          path: SIGN_UP_PATH,
          body: { ...validBody, email },
          findUserByEmail,
          reservedEmail: 'Admin@Example.com',
        }),
      );

      expect(error.statusCode).toBe(422);
      expect(error.body).toMatchObject({ code: 'USER_ALREADY_EXISTS' });
      expect(JSON.stringify(error.body)).not.toMatch(/admin/i);
      expect(findUserByEmail).not.toHaveBeenCalled();
    },
  );
});

/** `POST` JSON com o `X-Forwarded-For` de um cliente. */
function post(target: string, body: unknown) {
  return new Request(target, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.1',
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('stripSignUpRedirects (antes da conferência de origem)', () => {
  const basePath = '/api/auth';
  const url = `http://localhost:3000${basePath}${SIGN_UP_PATH}`;

  it('tira callbackURL e os outros redirecionamentos do corpo e da query do cadastro', async () => {
    const stripped = await stripSignUpRedirects(
      post(`${url}?callbackURL=https://evil.example/`, {
        ...validBody,
        image: 'javascript:alert(1)',
        callbackURL: 'https://evil.example/',
        redirectTo: 'https://evil.example/',
        errorCallbackURL: 'https://evil.example/',
        newUserCallbackURL: 'https://evil.example/',
      }),
      basePath,
    );

    expect(stripped).toBeDefined();
    expect(new URL(stripped!.url).searchParams.has('callbackURL')).toBe(false);
    expect(stripped!.headers.get('x-forwarded-for')).toBe('203.0.113.1');
    expect(await stripped!.json()).toEqual({
      ...validBody,
      image: 'javascript:alert(1)',
    });
  });

  it('deixa a requisição como veio fora do cadastro, sem redirecionamento ou com corpo inválido', async () => {
    const withCallback = { ...validBody, callbackURL: 'https://evil.example/' };
    await expect(
      stripSignUpRedirects(
        post(`http://localhost:3000${basePath}/sign-in/email`, withCallback),
        basePath,
      ),
    ).resolves.toBeUndefined();
    await expect(
      stripSignUpRedirects(post(url, validBody), basePath),
    ).resolves.toBeUndefined();
    await expect(
      stripSignUpRedirects(post(url, '{nao-e-json'), basePath),
    ).resolves.toBeUndefined();
  });
});
