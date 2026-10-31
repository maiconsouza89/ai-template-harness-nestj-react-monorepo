import { describe, expect, it } from 'vitest';
import {
  passwordSchema,
  signUpErrorCodes,
  signUpMessages,
  signUpSchema,
  toSignUpFieldErrors,
} from './accounts.js';

const rule =
  'A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número.';

function firstMessage(value: unknown): string | undefined {
  const result = passwordSchema.safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe('passwordSchema', () => {
  it('aceita senha com letra, número e 8 ou mais caracteres', () => {
    expect(passwordSchema.safeParse('Segura123').success).toBe(true);
    expect(passwordSchema.safeParse('abcdefg1').success).toBe(true);
  });

  it('recusa senha sem número com a regra inteira', () => {
    expect(firstMessage('segurança')).toBe(rule);
  });

  it('recusa senha sem letra com a regra inteira', () => {
    expect(firstMessage('12345678')).toBe(rule);
  });

  it('recusa senha curta com a regra inteira', () => {
    expect(firstMessage('Seg123')).toBe(rule);
    expect(firstMessage('Seg1234')).toBe(rule);
  });

  it('recusa senha ausente com a regra inteira', () => {
    expect(firstMessage(undefined)).toBe(rule);
  });

  it('recusa senha com mais de 128 caracteres', () => {
    expect(firstMessage(`a1${'x'.repeat(127)}`)).toBe(
      signUpMessages.passwordTooLong,
    );
  });
});

describe('signUpSchema', () => {
  const valid = {
    name: 'Ana Souza',
    email: 'ana@example.com',
    password: 'Segura123',
  };

  it('aceita o cadastro válido, com o e-mail em minúsculas e o nome sem espaços nas pontas', () => {
    const result = signUpSchema.safeParse({
      ...valid,
      name: '  Dani Melo ',
      email: ' Dani.Melo@Example.COM ',
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: 'Dani Melo',
      email: 'dani.melo@example.com',
      password: 'Segura123',
    });
  });

  it('recusa nome em branco', () => {
    const result = signUpSchema.safeParse({ ...valid, name: '   ' });
    expect(result.success).toBe(false);
    expect(toSignUpFieldErrors(result.error!)).toEqual([
      { field: 'name', message: signUpMessages.nameRequired },
    ]);
  });

  it('recusa e-mail inválido', () => {
    const result = signUpSchema.safeParse({ ...valid, email: 'joana@' });
    expect(result.success).toBe(false);
    expect(toSignUpFieldErrors(result.error!)).toEqual([
      { field: 'email', message: signUpMessages.emailInvalid },
    ]);
  });

  it('recusa e-mail com mais de 254 caracteres', () => {
    const email = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.com`;
    expect(signUpSchema.safeParse({ ...valid, email }).success).toBe(false);
  });

  it('aponta um item por campo recusado, na ordem do formulário', () => {
    const result = signUpSchema.safeParse({ email: 'x', password: 'abc' });
    expect(result.success).toBe(false);
    expect(toSignUpFieldErrors(result.error!)).toEqual([
      { field: 'name', message: signUpMessages.nameRequired },
      { field: 'email', message: signUpMessages.emailInvalid },
      { field: 'password', message: rule },
    ]);
  });
});

describe('signUpErrorCodes', () => {
  it('expõe os códigos do cadastro', () => {
    expect(signUpErrorCodes.validation).toBe('VALIDATION_ERROR');
    expect(signUpErrorCodes.userAlreadyExists).toBe('USER_ALREADY_EXISTS');
  });
});
