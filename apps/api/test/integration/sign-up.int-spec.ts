import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../../src/platform/prisma/prisma.service.js';
import { createTestApp } from '../create-test-app.js';
import { adminInicialCredentials } from '../factories/user.factory.js';

/**
 * Achado da revisão de segurança do commit 8a9835f: na fundação o cadastro é do RF-001 (spec,
 * "Fora desta spec"), então a borda nasce com o sign-up fechado. Aberto, qualquer requisição
 * criaria contas e alguém poderia registrar o e-mail de ADMIN_EMAIL antes do `make db-setup`,
 * que só garante papel e verificação na conta existente e a promoveria a admin.
 */
describe('Cadastro fechado na borda (integração, banco app_test)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('recusa POST /api/auth/sign-up/email e não cria conta', async () => {
    const email = `cadastro-${randomUUID()}@test.local`;
    const response = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({ name: 'Visitante', email, password: 'Senha1234' })
      .expect(400);

    expect(response.body.code).toBe('EMAIL_PASSWORD_SIGN_UP_DISABLED');
    expect(response.get('Set-Cookie') ?? []).toEqual([]);
    expect(await prisma.user.count({ where: { email } })).toBe(0);
  });

  it('não deixa registrar o e-mail de ADMIN_EMAIL antes do seed (pré-sequestro do admin)', async () => {
    const { email } = adminInicialCredentials();
    const response = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({ name: 'Impostor', email, password: 'Outra1234' })
      .expect(400);

    expect(response.body.code).toBe('EMAIL_PASSWORD_SIGN_UP_DISABLED');
    // Nenhuma conta com esse e-mail sem o papel admin: só o seed cria a conta do primeiro admin.
    expect(
      await prisma.user.count({
        where: {
          email: email.toLowerCase(),
          OR: [{ role: null }, { role: { not: 'admin' } }],
        },
      }),
    ).toBe(0);
  });
});
