import { describe, expect, it } from 'vitest';
import {
  apiErrorBodySchema,
  fieldErrorsFrom,
  PASSWORD_RULE_MESSAGE,
  passwordSchema,
  signUpSchema,
} from './accounts.js';

const valid = {
  name: 'Ana Souza',
  email: 'ana@example.com',
  password: 'senha1234',
};

function failedFields(input: unknown) {
  const result = signUpSchema.safeParse(input);
  expect(result.success).toBe(false);
  return fieldErrorsFrom(result.error!);
}

describe('passwordSchema', () => {
  it('aceita 8 caracteres com letra e número', () => {
    expect(passwordSchema.safeParse('abcdefg1').success).toBe(true);
    expect(passwordSchema.safeParse(`a${'1'.repeat(127)}`).success).toBe(true);
  });

  it.each([
    ['sem número', 'abcdefgh'],
    ['sem letra', '12345678'],
    ['com 7 caracteres', 'abc1234'],
  ])('recusa senha %s com a regra', (_caso, senha) => {
    const result = passwordSchema.safeParse(senha);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toContain(
      PASSWORD_RULE_MESSAGE,
    );
  });

  it('recusa 129 caracteres', () => {
    expect(passwordSchema.safeParse(`a${'1'.repeat(128)}`).success).toBe(false);
  });
});

describe('signUpSchema', () => {
  it('normaliza nome e e-mail', () => {
    expect(
      signUpSchema.parse({
        name: '  Ana Souza ',
        email: ' Ana@Example.COM ',
        password: 'senha1234',
      }),
    ).toEqual({
      name: 'Ana Souza',
      email: 'ana@example.com',
      password: 'senha1234',
    });
  });

  it.each([
    ['vazio', ''],
    ['só com espaços', '   '],
    ['com 101 caracteres', 'a'.repeat(101)],
  ])('recusa nome %s', (_caso, name) => {
    expect(failedFields({ ...valid, name })).toEqual([
      { field: 'name', message: expect.any(String) },
    ]);
  });

  it('aceita nome com 100 caracteres', () => {
    expect(
      signUpSchema.safeParse({ ...valid, name: 'a'.repeat(100) }).success,
    ).toBe(true);
  });

  it('recusa e-mail inválido ou ausente', () => {
    expect(failedFields({ ...valid, email: 'nao-e-um-email' })).toEqual([
      { field: 'email', message: 'Informe um e-mail válido.' },
    ]);
    expect(failedFields({ ...valid, email: '' })).toEqual([
      { field: 'email', message: 'O e-mail é obrigatório.' },
    ]);
  });

  it('devolve uma entrada por campo, com a regra no campo password', () => {
    expect(failedFields({ name: '', email: 'x', password: 'abc' })).toEqual([
      { field: 'name', message: 'O nome é obrigatório.' },
      { field: 'email', message: 'Informe um e-mail válido.' },
      { field: 'password', message: PASSWORD_RULE_MESSAGE },
    ]);
  });

  it('recusa campos ausentes com mensagens em português', () => {
    expect(failedFields({})).toEqual([
      { field: 'name', message: 'O nome é obrigatório.' },
      { field: 'email', message: 'O e-mail é obrigatório.' },
      { field: 'password', message: PASSWORD_RULE_MESSAGE },
    ]);
  });

  it('a mensagem de erro nunca contém a senha', () => {
    const senha = 'semnumeroxyz';
    const fields = failedFields({ ...valid, password: senha });
    expect(JSON.stringify(fields)).not.toContain(senha);
  });
});

describe('apiErrorBodySchema', () => {
  it('aceita o corpo do 400 com campos e o do 422 sem campos', () => {
    expect(
      apiErrorBodySchema.safeParse({
        code: 'VALIDATION_ERROR',
        message: 'Dados de cadastro inválidos.',
        fields: [{ field: 'password', message: PASSWORD_RULE_MESSAGE }],
      }).success,
    ).toBe(true);
    expect(
      apiErrorBodySchema.safeParse({
        code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
        message: 'User already exists. Use another email.',
      }).success,
    ).toBe(true);
  });
});
