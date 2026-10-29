import { PASSWORD_RULE_MESSAGE } from '@app/contracts';
import { isAPIError } from 'better-auth/api';
import {
  SIGN_UP_PATH,
  signUpBeforeHandler,
  type SignUpHookContext,
} from './sign-up.hook.js';

/** Contexto com o adaptador trocado por dublê: só a busca por e-mail, com as chamadas gravadas. */
function contextWith(
  body: unknown,
  existing: unknown = null,
  path = SIGN_UP_PATH,
) {
  const findUserByEmail = vi.fn(async (_email: string) => existing);
  const ctx: SignUpHookContext = {
    path,
    body,
    context: { internalAdapter: { findUserByEmail } },
  };
  return { ctx, findUserByEmail };
}

async function rejectionOf(promise: Promise<unknown>) {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  if (!isAPIError(error)) throw new Error('esperava um APIError');
  return error;
}

const valid = {
  name: 'Ana Souza',
  email: 'ana@example.com',
  password: 'senha1234',
  callbackURL: 'http://localhost:5173/confirmar-email',
};

describe('signUpBeforeHandler', () => {
  it('ignora outras rotas sem ler o corpo nem o banco', async () => {
    const { ctx, findUserByEmail } = contextWith({}, null, '/sign-in/email');
    await expect(signUpBeforeHandler(ctx)).resolves.toBeUndefined();
    expect(findUserByEmail).not.toHaveBeenCalled();
  });

  it('normaliza nome e e-mail e mantém o resto do corpo', async () => {
    const { ctx, findUserByEmail } = contextWith({
      ...valid,
      name: '  Ana Souza  ',
      email: ' Ana@Example.COM ',
    });
    await expect(signUpBeforeHandler(ctx)).resolves.toEqual({
      context: { body: { ...valid } },
    });
    expect(findUserByEmail).toHaveBeenCalledWith('ana@example.com');
  });

  it('recusa corpo inválido com 400 VALIDATION_ERROR e um item por campo', async () => {
    const { ctx, findUserByEmail } = contextWith({
      name: '   ',
      email: 'nao-e-um-email',
      password: 'abcdefgh',
    });
    const error = await rejectionOf(signUpBeforeHandler(ctx));
    expect(error.statusCode).toBe(400);
    expect(error.body).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Dados de cadastro inválidos.',
      fields: [
        { field: 'name', message: 'O nome é obrigatório.' },
        { field: 'email', message: 'Informe um e-mail válido.' },
        { field: 'password', message: PASSWORD_RULE_MESSAGE },
      ],
    });
    expect(findUserByEmail).not.toHaveBeenCalled();
  });

  it('recusa corpo ausente com 400', async () => {
    const { ctx } = contextWith(undefined);
    const error = await rejectionOf(signUpBeforeHandler(ctx));
    expect(error.statusCode).toBe(400);
    expect(error.body?.code).toBe('VALIDATION_ERROR');
  });

  it('recusa e-mail já cadastrado com 422 e o código da biblioteca', async () => {
    const { ctx, findUserByEmail } = contextWith(
      { ...valid, email: 'Existente@Example.com' },
      { user: { id: 'u1' }, accounts: [] },
    );
    const error = await rejectionOf(signUpBeforeHandler(ctx));
    expect(error.statusCode).toBe(422);
    expect(error.body).toMatchObject({
      code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
    });
    expect(findUserByEmail).toHaveBeenCalledWith('existente@example.com');
  });

  it('a mensagem de erro nunca contém a senha', async () => {
    const password = 'semnumeroxyz';
    const { ctx } = contextWith({ ...valid, password });
    const error = await rejectionOf(signUpBeforeHandler(ctx));
    expect(JSON.stringify(error.body)).not.toContain(password);
    expect(error.message).not.toContain(password);
  });
});
