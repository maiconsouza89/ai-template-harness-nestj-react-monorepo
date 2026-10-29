import { INestApplication } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { seedAdminInicial } from '../../prisma/seed.js';
import type { Auth } from '../../src/modules/accounts/auth.js';
import { PrismaService } from '../../src/platform/prisma/prisma.service.js';
import { createTestApp } from '../create-test-app.js';
import { sessaoAdmin } from '../factories/session.factory.js';
import { adminInicialCredentials } from '../factories/user.factory.js';

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
    const session = await sessaoAdmin(app);

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
});
