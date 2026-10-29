import { INestApplication } from '@nestjs/common';
import { PASSWORD_RULE_MESSAGE } from '@app/contracts';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../../src/platform/prisma/prisma.service.js';
import { createTestApp } from '../create-test-app.js';
import {
  CONTA_EXISTENTE_EMAIL,
  contaExistente,
} from '../factories/user.factory.js';
import { randomClientIp, withClientIp } from '../http/client-ip.js';

/**
 * Cadastro aberto na borda do Better Auth (RF-001): substitui o teste da fundação que esperava o
 * cadastro fechado. Cada teste usa um IP próprio (`test/http/client-ip.ts`) e e-mails únicos,
 * porque o banco app_test é compartilhado pelos arquivos de integração.
 */
function uniqueEmail(prefix: string) {
  return `${prefix}-${randomUUID()}@example.com`;
}

describe('Cadastro por e-mail e senha (integração, banco app_test)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let ip: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(() => {
    ip = randomClientIp();
  });

  afterAll(async () => {
    await app.close();
  });

  function signUp(body: Record<string, unknown>) {
    return withClientIp(
      request(app.getHttpServer()).post('/api/auth/sign-up/email'),
      ip,
    ).send(body);
  }

  it('cria a conta pendente com papel user, sem sessão e com a senha em hash', async () => {
    const email = uniqueEmail('ana');
    const password = 'senha1234';
    const response = await signUp({
      name: 'Ana Souza',
      email,
      password,
    }).expect(200);

    expect(response.get('Set-Cookie') ?? []).toEqual([]);
    expect(response.body.token).toBeNull();
    expect(response.body.user).toMatchObject({
      name: 'Ana Souza',
      email,
      emailVerified: false,
      role: 'user',
    });

    const users = await prisma.user.findMany({
      where: { email },
      include: { accounts: true },
    });
    expect(users).toHaveLength(1);
    const [user] = users;
    expect(user.role).toBe('user');
    expect(user.emailVerified).toBe(false);
    expect(user.banned).not.toBe(true);
    expect(user.accounts).toHaveLength(1);
    expect(user.accounts[0].providerId).toBe('credential');
    expect(user.accounts[0].password).toBeTruthy();
    expect(user.accounts[0].password).not.toBe(password);
  });

  it('grava o e-mail em minúsculas e o nome sem espaços nas pontas', async () => {
    const local = `Maria.Silva-${randomUUID()}`;
    const response = await signUp({
      name: '  Maria Silva ',
      email: ` ${local}@Example.COM `,
      password: 'senha1234',
    }).expect(200);

    const email = `${local.toLowerCase()}@example.com`;
    expect(response.body.user.email).toBe(email);
    const users = await prisma.user.findMany({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe(email);
    expect(users[0].name).toBe('Maria Silva');
  });

  it('a factory conta-existente grava a conta que API-DUPLICADO-01 e 02 pedem', async () => {
    const conta = await contaExistente(app);
    const users = await prisma.user.findMany({
      where: { email: { equals: CONTA_EXISTENTE_EMAIL, mode: 'insensitive' } },
      include: { accounts: true },
    });
    expect(users).toHaveLength(1);
    const [user] = users;
    expect(user).toMatchObject({
      id: conta.userId,
      email: 'existente@example.com',
      role: 'user',
      emailVerified: false,
      banned: false,
    });
    expect(user.accounts).toHaveLength(1);
    expect(user.accounts[0].providerId).toBe('credential');
    expect(user.accounts[0].password).not.toBe(conta.password);
  });

  it.each([
    ['com a mesma caixa', CONTA_EXISTENTE_EMAIL],
    ['com outra combinação de maiúsculas', 'EXISTENTE@Example.com'],
  ])(
    'recusa e-mail já cadastrado %s com 422, sem segunda conta nem mudar a credencial',
    async (_caso, email) => {
      const conta = await contaExistente(app);
      const before = await prisma.account.findFirstOrThrow({
        where: { userId: conta.userId, providerId: 'credential' },
      });

      const response = await signUp({
        name: 'Outra Pessoa',
        email,
        password: 'outra1234',
      }).expect(422);

      expect(response.body.code).toBe('USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL');
      const users = await prisma.user.findMany({
        where: {
          email: { equals: CONTA_EXISTENTE_EMAIL, mode: 'insensitive' },
        },
        include: { accounts: true },
      });
      expect(users).toHaveLength(1);
      expect(users[0].id).toBe(conta.userId);
      expect(users[0].accounts).toHaveLength(1);
      expect(users[0].accounts[0].password).toBe(before.password);
    },
  );

  it.each([
    ['sem número', 'abcdefgh'],
    ['sem letra', '12345678'],
    ['com 7 caracteres', 'abc1234'],
  ])(
    'recusa senha %s com 400, a regra no campo password e sem conta',
    async (_caso, password) => {
      const email = uniqueEmail('senha');
      const response = await signUp({ name: 'Ana', email, password }).expect(
        400,
      );

      expect(response.body).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Dados de cadastro inválidos.',
        fields: [{ field: 'password', message: PASSWORD_RULE_MESSAGE }],
      });
      expect(await prisma.user.count({ where: { email } })).toBe(0);
    },
  );

  it('aceita a senha de 8 caracteres com letra e número', async () => {
    const email = uniqueEmail('limite');
    await signUp({ name: 'Ana', email, password: 'abcdefg1' }).expect(200);
    expect(await prisma.user.count({ where: { email } })).toBe(1);
  });

  it.each([
    ['só com espaços', '   '],
    ['com 101 caracteres', 'a'.repeat(101)],
  ])(
    'recusa nome %s com 400 no campo name e sem conta',
    async (_caso, name) => {
      const email = uniqueEmail('nome');
      const response = await signUp({
        name,
        email,
        password: 'senha1234',
      }).expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(
        response.body.fields.map((f: { field: string }) => f.field),
      ).toEqual(['name']);
      expect(await prisma.user.count({ where: { email } })).toBe(0);
    },
  );

  it('aceita nome de 100 caracteres e o grava inteiro', async () => {
    const email = uniqueEmail('nome-limite');
    const name = 'a'.repeat(100);
    await signUp({ name, email, password: 'senha1234' }).expect(200);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.name).toBe(name);
  });

  it('recusa e-mail inválido com 400 no campo email, sem mudar o número de contas', async () => {
    const before = await prisma.user.count();
    const response = await signUp({
      name: 'Ana',
      email: 'nao-e-um-email',
      password: 'senha1234',
    }).expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(
      response.body.fields.map((f: { field: string }) => f.field),
    ).toContain('email');
    expect(await prisma.user.count()).toBe(before);
  });

  it('devolve um item por campo inválido quando o corpo vem vazio', async () => {
    const response = await signUp({}).expect(400);
    expect(response.body.fields.map((f: { field: string }) => f.field)).toEqual(
      ['name', 'email', 'password'],
    );
  });

  it('não devolve a senha na resposta, aceita ou recusada', async () => {
    const accepted = 'Sigilo9876';
    const ok = await signUp({
      name: 'Ana',
      email: uniqueEmail('sigilo'),
      password: accepted,
    }).expect(200);
    expect(ok.text).not.toContain(accepted);

    const refused = 'semnumeroxyz';
    const bad = await signUp({
      name: 'Ana',
      email: uniqueEmail('recusa'),
      password: refused,
    }).expect(400);
    expect(bad.text).not.toContain(refused);
  });
});
