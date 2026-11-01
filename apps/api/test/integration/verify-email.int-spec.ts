import { createHash, randomUUID } from 'node:crypto';
import { verifyEmailMessages } from '@app/contracts';
import type { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { EMAIL_SEND_QUEUE } from '../../src/modules/email/infra/queue/email-send.queue.js';
import { PrismaService } from '../../src/platform/prisma/prisma.service.js';
import { createTestApp, isolatedEmailQueue } from '../create-test-app.js';
import {
  confirmationTokens,
  emailVerificationRecordsOf,
  latestConfirmationToken,
  moveEmailVerificationExpiry,
} from '../factories/user.factory.js';
import { deleteMessagesTo, messagesTo } from '../mailpit.js';

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

/**
 * Confirmação de e-mail em `GET /api/auth/verify-email` e reenvio em
 * `POST /api/auth/send-verification-email` (RF-002), com o banco app_test, o Valkey e o Mailpit
 * do Compose. Cada caso cria a conta pelo cadastro e lê o token do link na caixa do Mailpit
 * (`latestConfirmationToken`); o vencimento se move no registro de confirmação
 * (`moveEmailVerificationExpiry`). Cada caso manda um `X-Forwarded-For` próprio da faixa
 * 203.0.113.0/24 e o `createTestApp` apaga os contadores do rate limit na subida, o que garante
 * `janela-de-cadastro-livre` e `janela-de-reenvio-livre`. A fila usa um prefixo próprio do
 * BullMQ, para o worker desta aplicação entregar os e-mails.
 */
describe('Confirmação de e-mail (integração, banco app_test)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let queue: Queue;
  const created = new Set<string>();

  function uniqueEmail(handle: string): string {
    const email = `${handle}-${randomUUID().slice(0, 8)}@example.com`;
    created.add(email);
    return email;
  }

  async function signUp(ip: string, email: string, name = 'Lia Mendes') {
    const response = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .set('X-Forwarded-For', ip)
      .send({ name, email, password: 'Segura123' })
      .expect(200);
    return (response.body as { user: { id: string } }).user.id;
  }

  function verify(token: string | undefined, ip = '203.0.113.99') {
    const query = token === undefined ? '' : `?token=${token}`;
    return request(app.getHttpServer())
      .get(`/api/auth/verify-email${query}`)
      .set('X-Forwarded-For', ip);
  }

  function resend(ip: string, email: string) {
    return request(app.getHttpServer())
      .post('/api/auth/send-verification-email')
      .set('X-Forwarded-For', ip)
      .send({ email });
  }

  async function emailVerified(userId: string) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { emailVerified: true },
    });
    return user.emailVerified;
  }

  function records(userId: string) {
    return prisma.verification.findMany({
      where: emailVerificationRecordsOf(userId),
    });
  }

  beforeAll(async () => {
    app = await createTestApp(
      isolatedEmailQueue(`bull-verify-${randomUUID()}`),
    );
    prisma = app.get(PrismaService);
    queue = app.get<Queue>(getQueueToken(EMAIL_SEND_QUEUE));
  });

  afterAll(async () => {
    await Promise.all(
      [...created].map((email) => deleteMessagesTo(email).catch(() => {})),
    );
    await queue.obliterate({ force: true });
    await app.close();
  }, 60_000);

  it('o cadastro grava um registro de confirmação de 24 horas, sem o token', async () => {
    const email = uniqueEmail('lucas');
    const userId = await signUp('203.0.113.60', email, 'Lucas Prado');
    const answeredAt = Date.now();
    const token = await latestConfirmationToken(email);

    const rows = await records(userId);
    expect(rows).toHaveLength(1);
    const [row] = rows;
    const remaining = row!.expiresAt.getTime() - answeredAt;
    expect(remaining).toBeGreaterThan(DAY_MS - MINUTE_MS);
    expect(remaining).toBeLessThan(DAY_MS + MINUTE_MS);
    expect(row!.identifier).toBe(
      `email-verification:${createHash('sha256').update(token).digest('hex')}`,
    );
    expect(row!.identifier).not.toContain(token);
    expect(row!.value).not.toContain(token);
  });

  it('o link ativa a conta sem cookie nem sessão e, reaberto, responde ALREADY_VERIFIED', async () => {
    const email = uniqueEmail('lia');
    const userId = await signUp('203.0.113.61', email);
    const token = await latestConfirmationToken(email);

    const first = await verify(token).expect(200);
    expect(first.body).toEqual({ status: true, user: null });
    expect(first.headers['set-cookie']).toBeUndefined();
    expect(await emailVerified(userId)).toBe(true);
    expect(await prisma.session.count({ where: { userId } })).toBe(0);
    expect(await records(userId)).toHaveLength(0);

    const second = await verify(token).expect(200);
    expect(second.body).toEqual({ status: true, code: 'ALREADY_VERIFIED' });
    expect(await emailVerified(userId)).toBe(true);
    expect(await records(userId)).toHaveLength(0);
  });

  it('o link já usado de uma conta que voltou a pendente não ativa de novo', async () => {
    const email = uniqueEmail('luna');
    const userId = await signUp('203.0.113.62', email);
    const token = await latestConfirmationToken(email);
    await verify(token).expect(200);
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: false },
    });

    const response = await verify(token).expect(401);
    expect(response.body).toMatchObject({
      code: 'INVALID_TOKEN',
      message: verifyEmailMessages.invalidToken,
    });
    expect(await emailVerified(userId)).toBe(false);
  });

  it('o link ainda dentro do prazo ativa a conta', async () => {
    const email = uniqueEmail('lara');
    const userId = await signUp('203.0.113.63', email);
    const token = await latestConfirmationToken(email);
    expect(
      await moveEmailVerificationExpiry(
        app,
        userId,
        new Date(Date.now() + MINUTE_MS),
      ),
    ).toBe(1);

    await verify(token).expect(200);
    expect(await emailVerified(userId)).toBe(true);
  });

  it('o registro vencido responde 401 TOKEN_EXPIRED, também na segunda abertura, e o registro fica', async () => {
    const email = uniqueEmail('mia');
    const userId = await signUp('203.0.113.64', email);
    const token = await latestConfirmationToken(email);
    await moveEmailVerificationExpiry(
      app,
      userId,
      new Date(Date.now() - MINUTE_MS),
    );

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await verify(token).expect(401);
      expect(response.body).toMatchObject({
        code: 'TOKEN_EXPIRED',
        message: verifyEmailMessages.tokenExpired,
      });
    }
    expect(await emailVerified(userId)).toBe(false);
    expect(await records(userId)).toHaveLength(1);
  });

  it('o reenvio troca o registro, o link anterior deixa de valer e o novo ativa a conta', async () => {
    const email = uniqueEmail('nina');
    const userId = await signUp('203.0.113.65', email);
    const [before] = await records(userId);
    // Sem esperar a primeira mensagem: o reenvio sai no mesmo segundo do cadastro, e o link
    // novo ainda precisa ser outro.
    const response = await resend('203.0.113.66', email).expect(200);
    const answeredAt = Date.now();
    expect(response.body).toEqual({ status: true });

    const rows = await records(userId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).not.toBe(before!.id);
    const remaining = rows[0]!.expiresAt.getTime() - answeredAt;
    expect(remaining).toBeGreaterThan(DAY_MS - MINUTE_MS);
    expect(remaining).toBeLessThan(DAY_MS + MINUTE_MS);

    const [t2, t1] = await confirmationTokens(email, { messages: 2 });
    expect(t2).not.toBe(t1);
    expect(rows[0]!.identifier).toBe(
      `email-verification:${createHash('sha256').update(t2!).digest('hex')}`,
    );

    const old = await verify(t1!).expect(401);
    expect(old.body).toMatchObject({ code: 'INVALID_TOKEN' });
    expect(await emailVerified(userId)).toBe(false);

    await verify(t2!).expect(200);
    expect(await emailVerified(userId)).toBe(true);
  });

  it('dois pedidos simultâneos com o mesmo link ativam a conta uma vez', async () => {
    const email = uniqueEmail('lis');
    const userId = await signUp('203.0.113.67', email);
    const token = await latestConfirmationToken(email);

    const responses = await Promise.all([
      verify(token, '203.0.113.68'),
      verify(token, '203.0.113.69'),
    ]);

    const activated = responses.filter(
      (r) => r.status === 200 && r.body.code === undefined,
    );
    expect(activated).toHaveLength(1);
    const other = responses.find((r) => !activated.includes(r))!;
    expect(
      (other.status === 200 && other.body.code === 'ALREADY_VERIFIED') ||
        (other.status === 401 && other.body.code === 'INVALID_TOKEN'),
    ).toBe(true);
    expect(await emailVerified(userId)).toBe(true);
    expect(await records(userId)).toHaveLength(0);
  });

  it('o quarto reenvio em 60 segundos do mesmo IP responde 429 com X-Retry-After', async () => {
    const email = uniqueEmail('nico');
    await signUp('203.0.113.70', email);
    const ip = '203.0.113.71';
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await resend(ip, email).expect(200);
    }

    const response = await resend(ip, email).expect(429);
    expect(response.headers['x-retry-after']).toBeDefined();
  });

  it('o link adulterado responde 401 INVALID_TOKEN e mantém o registro', async () => {
    const email = uniqueEmail('olga');
    const userId = await signUp('203.0.113.72', email);
    const token = await latestConfirmationToken(email);
    const tampered = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`;

    const response = await verify(tampered).expect(401);
    expect(response.body).toMatchObject({ code: 'INVALID_TOKEN' });
    expect(await emailVerified(userId)).toBe(false);
    expect(await records(userId)).toHaveLength(1);
  });

  it('sem token responde 401 INVALID_TOKEN', async () => {
    const response = await verify(undefined).expect(401);
    expect(response.body).toMatchObject({ code: 'INVALID_TOKEN' });
  });

  it('o reenvio para conta já ativa responde 200 sem enviar nem gravar registro', async () => {
    const email = uniqueEmail('raul');
    const userId = await signUp('203.0.113.73', email);
    await verify(await latestConfirmationToken(email)).expect(200);

    const response = await resend('203.0.113.74', email).expect(200);
    expect(response.body).toEqual({ status: true });
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    expect(await messagesTo(email)).toHaveLength(1);
    expect(await records(userId)).toHaveLength(0);
  });
});
