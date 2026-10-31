import { INestApplication } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import request from 'supertest';
import { App } from 'supertest/types.js';
import {
  adminSeedSchema,
  SeedAdminBannedError,
  SeedAdminConflictError,
  seedAdminInicial,
} from '../../prisma/seed.js';
import type { Auth } from '../../src/modules/accounts/auth.js';
import { PrismaService } from '../../src/platform/prisma/prisma.service.js';
import { createTestApp } from '../create-test-app.js';
import { sessaoAdmin } from '../factories/session.factory.js';
import {
  adminBanido,
  adminInicialCredentials,
  contaComumComEmailDoAdmin,
} from '../factories/user.factory.js';

describe('Seed do primeiro admin (integração, banco app_test)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let auth: Auth;
  const credentials = adminInicialCredentials();
  const email = credentials.email.toLowerCase();

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    auth = (app.get(AuthService) as AuthService<Auth>).instance;
    await prisma.user.deleteMany({ where: { email } });
  });

  afterAll(async () => {
    await app.close();
  });

  it('cria a conta admin verificada, sem banimento e com a senha em hash', async () => {
    const result = await seedAdminInicial(prisma, auth, credentials);
    expect(result.created).toBe(true);

    const users = await prisma.user.findMany({
      where: { email },
      include: { accounts: true },
    });
    expect(users).toHaveLength(1);
    const [user] = users;
    expect(user.id).toBe(result.userId);
    expect(user.role).toBe('admin');
    expect(user.emailVerified).toBe(true);
    expect(user.banned).toBe(false);
    expect(user.accounts).toHaveLength(1);
    expect(user.accounts[0].providerId).toBe('credential');
    expect(user.accounts[0].password).toBeTruthy();
    expect(user.accounts[0].password).not.toBe(credentials.password);
  });

  it('rodar de novo não duplica a conta nem muda a senha', async () => {
    const before = await prisma.account.findFirstOrThrow({
      where: { user: { email }, providerId: 'credential' },
    });

    const result = await seedAdminInicial(prisma, auth, credentials);
    expect(result.created).toBe(false);

    expect(await prisma.user.count({ where: { email } })).toBe(1);
    const after = await prisma.account.findFirstOrThrow({
      where: { user: { email }, providerId: 'credential' },
    });
    expect(after.password).toBe(before.password);
  });

  it('entra por POST /api/auth/sign-in/email com a senha do seed e lê a sessão como admin', async () => {
    const session = await sessaoAdmin(app, '203.0.113.200');

    const setCookie = session.signIn.get('Set-Cookie') ?? [];
    expect(setCookie.some((c) => /HttpOnly/i.test(c))).toBe(true);
    expect(JSON.stringify(session.signIn.body)).not.toContain(
      credentials.password,
    );

    await request(app.getHttpServer())
      .get('/api/v1/session')
      .set('Cookie', session.cookie)
      .expect(200)
      .expect({ userId: session.userId, role: 'admin' });
  });

  it('a factory conta-comum-com-email-do-admin grava a conta comum que o CLI-ADMIN-04 pede', async () => {
    const conta = await contaComumComEmailDoAdmin(app);
    try {
      expect(conta.email).toBe(email);
      expect(conta.password).not.toBe(credentials.password);

      const users = await prisma.user.findMany({
        where: { email },
        include: { accounts: true },
      });
      expect(users).toHaveLength(1);
      const [user] = users;
      expect(user.id).toBe(conta.userId);
      expect(user.role).toBeNull();
      expect(user.emailVerified).toBe(false);
      expect(user.banned).toBe(false);
      expect(user.accounts).toHaveLength(1);
      const [account] = user.accounts;
      expect(account.providerId).toBe('credential');
      expect(account.password).toBeTruthy();
      expect(account.password).not.toBe(conta.password);

      const ctx = await auth.$context;
      expect(
        await ctx.password.verify({
          hash: account.password as string,
          password: conta.password,
        }),
      ).toBe(true);
      expect(
        await ctx.password.verify({
          hash: account.password as string,
          password: credentials.password,
        }),
      ).toBe(false);
    } finally {
      // Não deixa uma conta comum com ADMIN_EMAIL no banco compartilhado pelos outros arquivos.
      await prisma.user.deleteMany({ where: { email } });
    }
  });

  it('a factory admin-banido grava o admin banido que o CLI-ADMIN-05 pede', async () => {
    const conta = await adminBanido(app);
    try {
      expect(conta.email).toBe(email);
      expect(conta.password).toBe(credentials.password);

      const users = await prisma.user.findMany({
        where: { email },
        include: { accounts: true },
      });
      expect(users).toHaveLength(1);
      const [user] = users;
      expect(user.id).toBe(conta.userId);
      expect(user.role).toBe('admin');
      expect(user.emailVerified).toBe(true);
      expect(user.banned).toBe(true);
      expect(user.banExpires).toBeNull();
      expect(user.accounts).toHaveLength(1);
      const [account] = user.accounts;
      expect(account.providerId).toBe('credential');
      expect(account.password).toBeTruthy();
      expect(account.password).not.toBe(credentials.password);

      const ctx = await auth.$context;
      expect(
        await ctx.password.verify({
          hash: account.password as string,
          password: credentials.password,
        }),
      ).toBe(true);
    } finally {
      // Não deixa um admin banido com ADMIN_EMAIL no banco compartilhado pelos outros arquivos.
      await prisma.user.deleteMany({ where: { email } });
    }
  });

  it('recusa conta pré-existente sem papel admin e não a altera (CLI-ADMIN-04)', async () => {
    const conta = await contaComumComEmailDoAdmin(app);
    try {
      const before = await prisma.account.findFirstOrThrow({
        where: { userId: conta.userId, providerId: 'credential' },
      });

      await expect(
        seedAdminInicial(prisma, auth, credentials),
      ).rejects.toBeInstanceOf(SeedAdminConflictError);
      await expect(seedAdminInicial(prisma, auth, credentials)).rejects.toThrow(
        /já existe conta com o e-mail de ADMIN_EMAIL sem papel admin/,
      );

      const users = await prisma.user.findMany({
        where: { email },
        include: { accounts: true },
      });
      expect(users).toHaveLength(1);
      const [user] = users;
      expect(user.id).toBe(conta.userId);
      expect(user.role).toBeNull();
      expect(user.emailVerified).toBe(false);
      expect(user.accounts).toHaveLength(1);
      expect(user.accounts[0].password).toBe(before.password);
    } finally {
      await prisma.user.deleteMany({ where: { email } });
    }
  });

  it('recusa admin com banimento em vigor e não o altera (CLI-ADMIN-05)', async () => {
    const conta = await adminBanido(app);
    try {
      const before = await prisma.account.findFirstOrThrow({
        where: { userId: conta.userId, providerId: 'credential' },
      });

      await expect(
        seedAdminInicial(prisma, auth, credentials),
      ).rejects.toBeInstanceOf(SeedAdminBannedError);
      await expect(seedAdminInicial(prisma, auth, credentials)).rejects.toThrow(
        /a conta admin com o e-mail de ADMIN_EMAIL está banida/,
      );

      const user = await prisma.user.findUniqueOrThrow({
        where: { id: conta.userId },
        include: { accounts: true },
      });
      expect(user.role).toBe('admin');
      expect(user.banned).toBe(true);
      expect(user.accounts[0].password).toBe(before.password);
      expect(await prisma.user.count({ where: { email } })).toBe(1);
    } finally {
      await prisma.user.deleteMany({ where: { email } });
    }
  });

  it('ignora banimento vencido, que o plugin admin retira na próxima sessão', async () => {
    const conta = await adminBanido(app);
    try {
      await prisma.user.update({
        where: { id: conta.userId },
        data: { banExpires: new Date(Date.now() - 60_000) },
      });
      const result = await seedAdminInicial(prisma, auth, credentials);
      expect(result).toEqual({ userId: conta.userId, created: false });
    } finally {
      await prisma.user.deleteMany({ where: { email } });
    }
  });

  it('exige letra e número em ADMIN_PASSWORD, nomeando a variável (CLI-ADMIN-06)', () => {
    const base = { ADMIN_EMAIL: credentials.email };
    const semNumero = 'x'.repeat(12);
    const semLetra = '7'.repeat(12);
    for (const senha of [semNumero, semLetra]) {
      const result = adminSeedSchema.safeParse({
        ...base,
        ADMIN_PASSWORD: senha,
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((issue) => issue.path[0])).toContain(
        'ADMIN_PASSWORD',
      );
    }
    expect(
      adminSeedSchema.safeParse({
        ...base,
        ADMIN_PASSWORD: credentials.password,
      }).success,
    ).toBe(true);
  });
});
