import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { EmailTransport } from '../../src/modules/email/domain/email-transport.js';
import { RequestEmailUseCase } from '../../src/modules/email/email.module.js';
import { EMAIL_SEND_QUEUE } from '../../src/modules/email/infra/queue/email-send.queue.js';
import { EmailSendProcessor } from '../../src/modules/email/infra/queue/email-send.processor.js';
import { NodemailerEmailTransport } from '../../src/modules/email/infra/smtp/nodemailer-email.transport.js';
import { ENV } from '../../src/platform/config/config.module.js';
import { type Env, loadEnv } from '../../src/platform/config/env.js';
import { PrismaService } from '../../src/platform/prisma/prisma.service.js';
import { createTestApp, isolatedEmailQueue } from '../create-test-app.js';
import { FlakyEmailTransport } from '../doubles/flaky-email.transport.js';
import { deleteMessagesTo, waitForMessagesTo } from '../mailpit.js';

/**
 * Módulo E-mail de ponta a ponta com o Valkey e o Mailpit do Compose: o pedido entra pelo caso de
 * uso exportado ou pelo cadastro, o worker da própria aplicação de teste consome a fila e entrega
 * por SMTP. Cada
 * aplicação usa um prefixo próprio do BullMQ (`isolatedEmailQueue`).
 */
async function createAccount(app: INestApplication, name: string) {
  const email = `email-int-${randomUUID()}@example.com`;
  const user = await app.get(PrismaService).user.create({
    data: { id: randomUUID(), name, email },
  });
  return { userId: user.id, email, name };
}

async function waitForJob(
  queue: Queue,
  userId: string,
  isDone: (job: Job) => Promise<boolean>,
  timeoutMs = 20_000,
): Promise<Job> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const jobs = await queue.getJobs([
      'completed',
      'failed',
      'waiting',
      'active',
      'delayed',
    ]);
    const job = jobs.find((candidate) => candidate.data?.userId === userId);
    if (job && (await isDone(job))) return job;
    if (Date.now() > deadline) {
      throw new Error(`Job da conta ${userId} não terminou a tempo`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

describe('E-mail de confirmação (integração)', () => {
  describe('com o SMTP no ar', () => {
    let app: INestApplication<App>;
    let queue: Queue;
    let env: Env;
    const created: string[] = [];

    beforeAll(async () => {
      app = await createTestApp(isolatedEmailQueue(`bull-int-${randomUUID()}`));
      queue = app.get<Queue>(getQueueToken(EMAIL_SEND_QUEUE));
      env = app.get<Env>(ENV);
    });

    afterAll(async () => {
      await Promise.all(created.map(deleteMessagesTo));
      await queue.obliterate({ force: true });
      await app.close();
    });

    it('desliga a fila offline só no produtor; o worker espera a reconexão', () => {
      const producer = queue.opts.connection as {
        enableOfflineQueue?: boolean;
      };
      const worker = app.get(EmailSendProcessor).worker.opts.connection as {
        enableOfflineQueue?: boolean;
      };

      expect(producer.enableOfflineQueue).toBe(false);
      expect(worker.enableOfflineQueue).not.toBe(false);
      expect(app.get(EmailSendProcessor).worker.opts.prefix).toBe(
        queue.opts.prefix,
      );
    });

    it('entrega ao Mailpit o e-mail de confirmação em pt-BR, lendo nome e e-mail da conta', async () => {
      const account = await createAccount(app, 'Paula Dias');
      created.push(account.email);
      const url = `${env.WEB_ORIGIN}/confirmar-email?token=token-de-teste`;

      await app
        .get(RequestEmailUseCase)
        .execute({ type: 'verify-email', userId: account.userId, url });

      const messages = await waitForMessagesTo(account.email);
      expect(messages).toHaveLength(1);
      const [message] = messages;
      expect(message.From.Address).toBe(env.SMTP_FROM);
      expect(message.Subject).toBe('Confirme seu e-mail');
      expect(message.Text).toContain('Olá, Paula Dias!');
      expect(message.Text).toContain(url);
      expect(message.Text).toContain('O link vale por 24 horas.');
      expect(message.HTML).toContain('lang="pt-BR"');
      expect(message.HTML).toContain('O link vale por 24 horas.');
    });

    it('depois do cadastro, entrega o e-mail com o link da SPA e sem a senha', async () => {
      const email = `email-int-${randomUUID()}@example.com`;
      created.push(email);
      const password = 'Sigilo321w';

      const response = await request(app.getHttpServer())
        .post('/api/auth/sign-up/email')
        .set('X-Forwarded-For', '203.0.113.20')
        .send({ name: 'Quim Moura', email, password })
        .expect(200);

      const messages = await waitForMessagesTo(email);
      expect(messages).toHaveLength(1);
      const [message] = messages;
      expect(message.Subject).toBe('Confirme seu e-mail');
      expect(message.Text).toContain('Olá, Quim Moura!');
      expect(message.Text).toMatch(
        new RegExp(`${env.WEB_ORIGIN}/confirmar-email\\?token=[^\\s]+`),
      );
      expect(message.Text).not.toContain(password);
      expect(message.HTML).not.toContain(password);

      const job = await waitForJob(
        queue,
        response.body.user.id as string,
        async () => true,
      );
      expect(job.name).toBe('verify-email');
      expect(JSON.stringify(job.data)).not.toContain(password);
    });

    it('grava no job só o tipo, o id da conta e o link, com 5 tentativas e retenção', async () => {
      const account = await createAccount(app, 'Rui Campos');
      created.push(account.email);
      const url = `${env.WEB_ORIGIN}/confirmar-email?token=token-de-teste`;

      await app
        .get(RequestEmailUseCase)
        .execute({ type: 'verify-email', userId: account.userId, url });

      const job = await waitForJob(queue, account.userId, async () => true);
      expect(job.name).toBe('verify-email');
      expect(job.data).toEqual({
        type: 'verify-email',
        userId: account.userId,
        url,
      });
      const serialized = JSON.stringify(job.data);
      expect(serialized).not.toContain(account.email);
      expect(serialized).not.toContain(account.name);
      expect(job.opts).toMatchObject({
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 86400 },
        removeOnFail: { age: 604800 },
      });
    });

    it('conclui sem enviar o job de uma conta que não existe mais', async () => {
      const userId = `apagada-${randomUUID()}`;

      await app.get(RequestEmailUseCase).execute({
        type: 'verify-email',
        userId,
        url: `${env.WEB_ORIGIN}/confirmar-email?token=token-de-teste`,
      });

      const job = await waitForJob(queue, userId, (candidate) =>
        candidate.isCompleted(),
      );
      expect(job.returnvalue).toBe('discarded');
    });
  });

  describe('com o SMTP falhando na primeira tentativa', () => {
    let app: INestApplication<App>;
    let queue: Queue;
    let flaky: FlakyEmailTransport;
    const created: string[] = [];

    beforeAll(async () => {
      flaky = new FlakyEmailTransport(
        new NodemailerEmailTransport(loadEnv()),
        1,
      );
      app = await createTestApp((builder) =>
        isolatedEmailQueue(`bull-int-${randomUUID()}`)(builder)
          .overrideProvider(EmailTransport)
          .useValue(flaky),
      );
      queue = app.get<Queue>(getQueueToken(EMAIL_SEND_QUEUE));
    });

    afterAll(async () => {
      await Promise.all(created.map(deleteMessagesTo));
      await queue.obliterate({ force: true });
      await app.close();
    });

    it('tenta de novo depois do backoff e entrega', async () => {
      const account = await createAccount(app, 'Sara Pinto');
      created.push(account.email);

      await app.get(RequestEmailUseCase).execute({
        type: 'verify-email',
        userId: account.userId,
        url: 'http://localhost:5173/confirmar-email?token=token-de-teste',
      });

      const job = await waitForJob(queue, account.userId, (candidate) =>
        candidate.isCompleted(),
      );
      expect(flaky.attempts).toBe(2);
      expect(job.attemptsMade).toBeGreaterThan(1);
      expect(await waitForMessagesTo(account.email)).toHaveLength(1);
    }, 30_000);
  });
});
