import { createHash } from 'node:crypto';
import { resetPasswordMessages, signUpMessages } from '@app/contracts';
import { APIError } from 'better-auth/api';
import {
  checkResetPassword,
  checkResetPasswordStatus,
  createResetPasswordPlugin,
  RESET_PASSWORD_PATH,
  RESET_PASSWORD_STATUS_PATH,
  type ResetPasswordStatusInput,
  type ResetPasswordVerification,
} from './reset-password.plugin.js';

const NOW = new Date('2026-11-01T12:00:00.000Z');
// Token falso com a forma do Better Auth (24 alfanuméricos), de baixa entropia para o gitleaks.
const TOKEN = 'Ab1'.repeat(8);

/** Captura o `APIError` lançado por `run`, ou falha o teste. */
async function apiErrorOf(run: () => unknown): Promise<APIError> {
  try {
    await run();
  } catch (error) {
    expect(error).toBeInstanceOf(APIError);
    return error as APIError;
  }
  throw new Error('esperava um APIError');
}

/** A regra da troca como função, para os `expect(...).toThrow()`. */
function check(body: unknown, path = RESET_PASSWORD_PATH, query?: unknown) {
  return () => checkResetPassword({ path, body, query });
}

/** Entrada da checagem com as buscas como dublês; cada caso troca só o que importa. */
function input(
  overrides: {
    verification?: ResetPasswordVerification | null;
    user?: unknown;
    token?: unknown;
  } = {},
) {
  const findVerification = vi.fn((_identifier: string) =>
    Promise.resolve(
      overrides.verification === undefined
        ? { value: 'conta-1', expiresAt: new Date('2026-11-01T12:30:00Z') }
        : overrides.verification,
    ),
  );
  const findUserById = vi.fn((_id: string) =>
    Promise.resolve('user' in overrides ? overrides.user : { id: 'conta-1' }),
  );
  const value: ResetPasswordStatusInput = {
    token: 'token' in overrides ? overrides.token : TOKEN,
    findVerification,
    findUserById,
    now: () => NOW,
  };
  return { value, findVerification, findUserById };
}

async function expectInvalid(value: ResetPasswordStatusInput) {
  const error = await apiErrorOf(() => checkResetPasswordStatus(value));
  expect(error.statusCode).toBe(400);
  expect(error.body).toEqual({
    code: 'INVALID_TOKEN',
    message: resetPasswordMessages.invalidToken,
  });
}

describe('checkResetPassword', () => {
  it('ignora outros caminhos', () => {
    expect(check({ newPassword: 'curta' }, '/sign-up/email')).not.toThrow();
    expect(() =>
      checkResetPassword({
        path: undefined,
        body: { newPassword: 'curta' },
        query: undefined,
      }),
    ).not.toThrow();
  });

  it('deixa seguir a nova senha dentro da regra', () => {
    expect(check({ token: TOKEN, newPassword: 'Nova12345' })).not.toThrow();
  });

  it('deixa seguir sem token, para a biblioteca responder INVALID_TOKEN', () => {
    expect(check({ newPassword: 'Nova12345' })).not.toThrow();
  });

  it.each([
    ['sem número', 'semnumero'],
    ['sem letra', '12345678'],
    ['com 7 caracteres', 'Nova123'],
    ['ausente', undefined],
  ])(
    'recusa a nova senha %s com VALIDATION_ERROR e a regra no campo newPassword',
    async (_case, newPassword) => {
      const error = await apiErrorOf(check({ token: TOKEN, newPassword }));
      expect(error.statusCode).toBe(400);
      expect(error.body).toEqual({
        code: 'VALIDATION_ERROR',
        message: resetPasswordMessages.validation,
        fields: [
          { field: 'newPassword', message: signUpMessages.passwordRule },
        ],
      });
    },
  );

  it('recusa a nova senha acima de 128 caracteres com a mensagem do teto', async () => {
    const error = await apiErrorOf(
      check({ token: TOKEN, newPassword: `a1${'b'.repeat(127)}` }),
    );
    expect(error.body?.fields).toEqual([
      { field: 'newPassword', message: signUpMessages.passwordTooLong },
    ]);
  });

  it('não ecoa a senha recusada', async () => {
    const error = await apiErrorOf(
      check({ token: TOKEN, newPassword: 'semnumero' }),
    );
    expect(JSON.stringify(error.body)).not.toContain('semnumero');
  });

  it('recusa com INVALID_TOKEN o token com a forma do hash gravado, no corpo ou na query', async () => {
    const stored = createHash('sha256').update(TOKEN).digest('hex');
    for (const run of [
      check({ token: stored, newPassword: 'Nova12345' }),
      check({ newPassword: 'Nova12345' }, RESET_PASSWORD_PATH, {
        token: stored,
      }),
    ]) {
      const error = await apiErrorOf(run);
      expect(error.statusCode).toBe(400);
      expect(error.body).toMatchObject({ code: 'INVALID_TOKEN' });
    }
  });
});

describe('checkResetPasswordStatus', () => {
  it('responde válido com registro no prazo de conta que existe, buscando pelo identificador com prefixo', async () => {
    const { value, findVerification, findUserById } = input();
    await expect(checkResetPasswordStatus(value)).resolves.toEqual({
      valid: true,
    });
    expect(findVerification).toHaveBeenCalledWith(`reset-password:${TOKEN}`);
    expect(findUserById).toHaveBeenCalledWith('conta-1');
  });

  it('recusa o registro vencido, inclusive no instante do vencimento', async () => {
    await expectInvalid(
      input({
        verification: {
          value: 'conta-1',
          expiresAt: new Date(NOW.getTime() - 60_000),
        },
      }).value,
    );
    await expectInvalid(
      input({ verification: { value: 'conta-1', expiresAt: NOW } }).value,
    );
  });

  it('recusa sem registro e de conta que não existe mais', async () => {
    await expectInvalid(input({ verification: null }).value);
    await expectInvalid(input({ user: null }).value);
  });

  it('recusa sem token, sem buscar nada', async () => {
    for (const token of [undefined, '', ['a', 'b'], 42]) {
      const { value, findVerification } = input({ token });
      await expectInvalid(value);
      expect(findVerification).not.toHaveBeenCalled();
    }
  });

  it('recusa o token com a forma do hash gravado, sem buscar', async () => {
    const { value, findVerification } = input({
      token: createHash('sha256').update(TOKEN).digest('hex'),
    });
    await expectInvalid(value);
    expect(findVerification).not.toHaveBeenCalled();
  });

  it('não recebe nada que apague o registro: só lê', () => {
    const { value } = input();
    expect(Object.keys(value).toSorted()).toEqual([
      'findUserById',
      'findVerification',
      'now',
      'token',
    ]);
  });
});

describe('createResetPasswordPlugin', () => {
  it('expõe o endpoint GET de checagem e o hook só de /reset-password', () => {
    const plugin = createResetPasswordPlugin();
    expect(plugin.endpoints.resetPasswordStatus.path).toBe(
      RESET_PASSWORD_STATUS_PATH,
    );
    expect(plugin.endpoints.resetPasswordStatus.options.method).toBe('GET');
    const [hook] = plugin.hooks.before;
    expect(hook!.matcher({ path: RESET_PASSWORD_PATH } as never)).toBe(true);
    expect(hook!.matcher({ path: '/request-password-reset' } as never)).toBe(
      false,
    );
  });
});
