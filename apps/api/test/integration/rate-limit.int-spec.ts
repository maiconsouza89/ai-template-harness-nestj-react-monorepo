import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../../src/platform/prisma/prisma.service.js';
import { createTestApp } from '../create-test-app.js';
import {
  FailingEmailQueue,
  withFailingEmailQueue,
} from '../doubles/failing-email-queue.js';
import { withUnreachableValkey } from '../doubles/unreachable-valkey.js';
import { randomClientIp, withClientIp } from '../http/client-ip.js';

/**
 * Rate limit do Better Auth em `/api/auth` (RF-001), com os contadores no Valkey de teste: 5
 * cadastros por IP a cada 60 s, 100 requisições por IP a cada 10 s no resto, e fail-open com o
 * Valkey fora do ar. Cada teste usa IPs próprios (`test/http/client-ip.ts`) e e-mails únicos.
 */
function uniqueEmail(prefix: string) {
  return `${prefix}-${randomUUID()}@example.com`;
}

function signUp(app: INestApplication<App>, ip: string, email: string) {
  return withClientIp(
    request(app.getHttpServer()).post('/api/auth/sign-up/email'),
    ip,
  ).send({ name: 'Pessoa Limite', email, password: 'senha1234' });
}

describe('Rate limit de /api/auth (integração, Valkey do Compose)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('recusa com 429 e X-Retry-After o sexto cadastro do mesmo IP em 60 s, sem criar a conta', async () => {
    const ip = randomClientIp();
    for (let i = 0; i < 5; i++) {
      await signUp(app, ip, uniqueEmail('limite')).expect(200);
    }

    const email = uniqueEmail('sexto');
    const response = await signUp(app, ip, email).expect(429);

    expect(Number(response.get('X-Retry-After'))).toBeGreaterThan(0);
    expect(Number(response.get('X-Retry-After'))).toBeLessThanOrEqual(60);
    expect(response.body).toEqual({
      message: 'Too many requests. Please try again later.',
    });
    expect(await prisma.user.count({ where: { email } })).toBe(0);
  });

  it('conta cada IP à parte: outro IP cadastra depois de o primeiro esgotar o limite', async () => {
    const ip = randomClientIp();
    for (let i = 0; i < 5; i++) {
      await signUp(app, ip, uniqueEmail('esgota')).expect(200);
    }
    await signUp(app, ip, uniqueEmail('esgota')).expect(429);

    const email = uniqueEmail('outro-ip');
    await signUp(app, randomClientIp(), email).expect(200);
    expect(await prisma.user.count({ where: { email } })).toBe(1);
  });

  it('recusa com 429 a 101ª requisição do mesmo IP em 10 s nas outras rotas', async () => {
    const ip = randomClientIp();
    for (let i = 0; i < 100; i++) {
      await withClientIp(
        request(app.getHttpServer()).get('/api/auth/ok'),
        ip,
      ).expect(200);
    }
    await withClientIp(
      request(app.getHttpServer()).get('/api/auth/ok'),
      ip,
    ).expect(429);
  });
});

describe('Rate limit de /api/auth com o Valkey fora do ar (integração)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp({
      override: (builder) =>
        withFailingEmailQueue(new FailingEmailQueue())(
          withUnreachableValkey(builder),
        ),
    });
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('libera os cadastros (fail-open): nenhum dos seis do mesmo IP responde 429', async () => {
    const ip = randomClientIp();
    const emails = Array.from({ length: 6 }, () => uniqueEmail('fail-open'));
    const statuses: number[] = [];
    for (const email of emails) {
      statuses.push((await signUp(app, ip, email)).status);
    }

    expect(statuses).toEqual([200, 200, 200, 200, 200, 200]);
    expect(await prisma.user.count({ where: { email: { in: emails } } })).toBe(
      6,
    );
  });
});
