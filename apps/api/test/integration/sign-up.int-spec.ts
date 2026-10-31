import { randomUUID } from 'node:crypto';
import { signUpMessages } from '@app/contracts';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../../src/platform/prisma/prisma.service.js';
import { createTestApp } from '../create-test-app.js';
import {
  adminInicial,
  adminInicialCredentials,
  PENDING_ACCOUNT_ANA,
  pendingAccountAna,
} from '../factories/user.factory.js';
import { deleteMessagesTo, waitForMessagesTo } from '../mailpit.js';

/**
 * Cadastro aberto em `POST /api/auth/sign-up/email` (RF-001), que substitui a prova do cadastro
 * fechado da fundação. Cada caso manda um `X-Forwarded-For` próprio, da faixa de documentação
 * 203.0.113.0/24, e o `createTestApp` apaga os contadores do rate limit na subida: o limite de um
 * caso não afeta outro. Os e-mails são únicos por execução, para não se confundirem na caixa do
 * Mailpit, que é a mesma do ambiente local; as mensagens criadas são apagadas no fim.
 */
describe('Cadastro aberto (integração, banco app_test)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const created = new Set<string>();

  function uniqueEmail(handle: string): string {
    const email = `${handle}-${randomUUID().slice(0, 8)}@example.com`;
    created.add(email);
    return email;
  }

  function signUp(ip: string, body: Record<string, unknown>) {
    if (typeof body.email === 'string') created.add(body.email.toLowerCase());
    return request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .set('X-Forwarded-For', ip)
      .send(body);
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Espera o worker entregar o que os cadastros aceitos enfileiraram, para apagar da caixa; o
    // e-mail de um cadastro recusado nunca chega e não vale esperar por ele.
    const accepted = new Set(
      (
        await prisma.user.findMany({
          where: { email: { in: [...created] } },
          select: { email: true },
        })
      ).map(({ email }) => email),
    );
    await Promise.all(
      [...created].map(async (email) => {
        try {
          if (accepted.has(email)) await waitForMessagesTo(email, 5_000);
          await deleteMessagesTo(email);
        } catch {
          // Mailpit fora do ar: nada a limpar.
        }
      }),
    );
    await app.close();
  }, 60_000);

  it('cria a conta pendente com papel user, sem sessão e sem devolver a senha', async () => {
    const email = uniqueEmail('bia');
    const password = 'Sigilo123x';
    const response = await signUp('203.0.113.1', {
      name: 'Bia Lima',
      email,
      password,
    }).expect(200);

    expect(response.body.token).toBeNull();
    expect(response.body.user).toMatchObject({
      email,
      name: 'Bia Lima',
      emailVerified: false,
      role: 'user',
    });
    expect(response.get('Set-Cookie') ?? []).toEqual([]);
    expect(JSON.stringify(response.body)).not.toContain(password);

    const users = await prisma.user.findMany({
      where: { email },
      include: { accounts: true, sessions: true },
    });
    expect(users).toHaveLength(1);
    const [user] = users;
    expect(user.role).toBe('user');
    expect(user.emailVerified).toBe(false);
    expect(user.banned).toBe(false);
    expect(user.sessions).toHaveLength(0);
    expect(user.accounts).toHaveLength(1);
    expect(user.accounts[0].providerId).toBe('credential');
    expect(user.accounts[0].accountId).toBe(user.id);
    expect(user.accounts[0].password).toBeTruthy();
    expect(user.accounts[0].password).not.toContain(password);
    expect(JSON.stringify(user)).not.toContain(password);
  });

  it('grava em minúsculas o e-mail informado com maiúsculas', async () => {
    const email = uniqueEmail('dani.melo');
    const response = await signUp('203.0.113.2', {
      name: 'Dani Melo',
      email: email.replace('dani.melo', 'Dani.Melo').toUpperCase(),
      password: 'Segura123',
    }).expect(200);

    expect(response.body.user.email).toBe(email);
    expect(await prisma.user.count({ where: { email } })).toBe(1);
  });

  describe('com a conta-pendente-ana', () => {
    beforeAll(async () => {
      await pendingAccountAna(app, '203.0.113.3');
      created.add(PENDING_ACCOUNT_ANA.email);
    });

    it.each([['ana@example.com'], ['ANA@Example.Com']])(
      'recusa %s com 422 USER_ALREADY_EXISTS e não cria segunda conta',
      async (email) => {
        const response = await signUp('203.0.113.4', {
          name: 'Outra Ana',
          email,
          password: 'Segura123',
        }).expect(422);

        expect(response.body.code).toBe('USER_ALREADY_EXISTS');
        const users = await prisma.user.findMany({
          where: {
            email: { equals: PENDING_ACCOUNT_ANA.email, mode: 'insensitive' },
          },
        });
        expect(users).toHaveLength(1);
        expect(users[0].name).toBe('Ana Souza');
        expect(users[0].role).toBe('user');
        expect(users[0].emailVerified).toBe(false);
      },
    );
  });

  it('com dois cadastros simultâneos do mesmo e-mail, aceita um e recusa o outro com 422', async () => {
    const email = uniqueEmail('davi');
    const responses = await Promise.all([
      signUp('203.0.113.5', { name: 'Davi Um', email, password: 'Segura123' }),
      signUp('203.0.113.6', {
        name: 'Davi Dois',
        email,
        password: 'Segura123',
      }),
    ]);

    expect(responses.map((r) => r.status).toSorted()).toEqual([200, 422]);
    const refused = responses.find((r) => r.status === 422);
    expect(['USER_ALREADY_EXISTS', 'FAILED_TO_CREATE_USER']).toContain(
      refused?.body.code,
    );
    expect(await prisma.user.count({ where: { email } })).toBe(1);
  });

  it.each([
    ['sem número', 'SenhaSegura'],
    ['sem letra', '12345678'],
    ['com 7 caracteres', 'Seg1234'],
  ])(
    'recusa a senha %s com 400 VALIDATION_ERROR e a regra inteira',
    async (_case, password) => {
      const email = uniqueEmail('elis');
      const response = await signUp('203.0.113.7', {
        name: 'Elis Prado',
        email,
        password,
      }).expect(400);

      expect(response.body).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Confira os campos destacados.',
        fields: [{ field: 'password', message: signUpMessages.passwordRule }],
      });
      expect(await prisma.user.count({ where: { email } })).toBe(0);
    },
  );

  it('aceita a senha com exatamente 8 caracteres, uma letra e um número', async () => {
    const email = uniqueEmail('heitor');
    await signUp('203.0.113.8', {
      name: 'Heitor Paz',
      email,
      password: 'abcdefg1',
    }).expect(200);
    expect(await prisma.user.count({ where: { email } })).toBe(1);
  });

  it('descarta os campos fora do contrato do cadastro e grava só nome, e-mail e senha', async () => {
    const email = uniqueEmail('iris');
    await signUp('203.0.113.10', {
      name: 'Iris Nunes',
      email,
      password: 'Segura123',
      image: 'javascript:alert(1)',
      callbackURL: 'https://evil.example/',
      rememberMe: true,
      extra: 'ignorado',
    }).expect(200);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.image).toBeNull();
    expect(user.name).toBe('Iris Nunes');
  });

  it('recusa o e-mail de ADMIN_EMAIL, em maiúsculas, com 422 USER_ALREADY_EXISTS antes do seed', async () => {
    const { email } = adminInicialCredentials();
    // Antes do seed: nenhuma conta com o e-mail do admin; o admin volta pelo seed no fim.
    await prisma.user.deleteMany({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    try {
      const response = await signUp('203.0.113.11', {
        name: 'Falso Admin',
        email: email.toUpperCase(),
        password: 'Segura123',
      }).expect(422);

      expect(response.body.code).toBe('USER_ALREADY_EXISTS');
      expect(JSON.stringify(response.body)).not.toMatch(/admin/i);
      expect(
        await prisma.user.count({
          where: { email: { equals: email, mode: 'insensitive' } },
        }),
      ).toBe(0);
    } finally {
      // Recusado, não há e-mail a esperar na caixa no afterAll.
      created.delete(email.toLowerCase());
      await adminInicial(app);
    }
  });

  it.each([
    ['o nome só com espaços', { name: '   ', password: 'Segura123' }, 'name'],
    [
      'o e-mail inválido',
      { name: 'Joana Luz', email: 'joana@', password: 'Segura123' },
      'email',
    ],
    ['sem senha', { name: 'Kai Lopes' }, 'password'],
  ])(
    'recusa %s com 400 VALIDATION_ERROR apontando o campo',
    async (_case, body: Record<string, unknown>, field) => {
      const email = (body.email as string | undefined) ?? uniqueEmail('campos');
      const response = await signUp('203.0.113.9', { email, ...body }).expect(
        400,
      );

      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.fields).toEqual([
        { field, message: expect.any(String) },
      ]);
      expect(await prisma.user.count({ where: { email } })).toBe(0);
    },
  );

  it('recusa o sexto cadastro do mesmo IP em 60 s com 429 e X-Retry-After, sem afetar outro IP', async () => {
    const emails = Array.from({ length: 6 }, (_, i) =>
      uniqueEmail(`limite${i + 1}`),
    );
    const statuses: number[] = [];
    let last: request.Response | undefined;
    for (const email of emails) {
      last = await signUp('203.0.113.50', {
        name: 'Teste Limite',
        email,
        password: 'Segura123',
      });
      statuses.push(last.status);
    }

    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    expect(Number(last?.get('X-Retry-After'))).toBeGreaterThan(0);
    expect(await prisma.user.count({ where: { email: emails[5] } })).toBe(0);

    const other = uniqueEmail('limite7');
    await signUp('203.0.113.51', {
      name: 'Teste Limite',
      email: other,
      password: 'Segura123',
    }).expect(200);
    expect(await prisma.user.count({ where: { email: other } })).toBe(1);
  });
});
