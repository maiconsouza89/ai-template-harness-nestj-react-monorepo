import { INestApplication } from '@nestjs/common';
import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../../src/platform/prisma/prisma.service.js';
import { createTestApp } from '../create-test-app.js';
import {
  FailingEmailQueue,
  withFailingEmailQueue,
} from '../doubles/failing-email-queue.js';
import { withClientIp } from '../http/client-ip.js';
import { waitForMessages } from '../mailpit.js';

/**
 * E-mail de confirmação do cadastro pela fila `email.send` (RF-001): o cadastro gera uma mensagem
 * no Mailpit do Compose, enviada pelo worker no processo da aplicação de teste, com o link de
 * 24 horas e sem a senha; com a fila trocada pelo dublê que falha, a conta é criada e a resposta
 * continua 200. E-mails únicos por teste, porque a caixa e o banco são compartilhados.
 */
function uniqueEmail(prefix: string) {
  return `${prefix}-${randomUUID()}@example.com`;
}

/** Payload de um JWT, sem verificar a assinatura (a API verifica ao abrir o link, no RF-002). */
function jwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

/** Todos os valores guardados nas chaves `bull:email.send:*` do Valkey de teste. */
async function bullValues(redis: Redis): Promise<string> {
  const keys = await redis.keys('bull:email.send:*');
  const values: string[] = [];
  for (const key of keys) {
    const type = await redis.type(key);
    if (type === 'hash') values.push(JSON.stringify(await redis.hgetall(key)));
    if (type === 'string') values.push((await redis.get(key)) ?? '');
    if (type === 'list') values.push(...(await redis.lrange(key, 0, -1)));
    if (type === 'set') values.push(...(await redis.smembers(key)));
    if (type === 'zset') values.push(...(await redis.zrange(key, 0, -1)));
    if (type === 'stream') {
      values.push(JSON.stringify(await redis.xrange(key, '-', '+')));
    }
  }
  return values.join('\n');
}

describe('E-mail de confirmação do cadastro (integração, Mailpit e Valkey do Compose)', () => {
  let app: INestApplication<App>;
  let redis: Redis;

  beforeAll(async () => {
    app = await createTestApp();
    redis = new Redis(process.env.REDIS_URL as string);
  });

  afterAll(async () => {
    redis.disconnect();
    await app.close();
  });

  function signUp(body: Record<string, unknown>) {
    return withClientIp(
      request(app.getHttpServer()).post('/api/auth/sign-up/email'),
    ).send(body);
  }

  it('envia uma mensagem em pt-BR para o endereço, com o link de 24 horas e sem a senha', async () => {
    const local = `Nova.Pessoa-${randomUUID()}`;
    const password = 'Segredo4321';
    await signUp({
      name: 'Nova Pessoa',
      email: `${local}@Example.com`,
      password,
    }).expect(200);

    const to = `${local.toLowerCase()}@example.com`;
    const messages = await waitForMessages(to);
    expect(messages).toHaveLength(1);
    const [message] = messages;

    expect(message.To.map((address) => address.Address)).toEqual([to]);
    expect(message.From.Address).toBe(process.env.SMTP_FROM);
    expect(message.Subject).toBe('Confirme seu e-mail');
    expect(message.Text).toContain('Nova Pessoa');
    expect(message.Text).toContain('O link vale por 24 horas.');

    const prefix = `${process.env.BETTER_AUTH_URL}/api/auth/verify-email?token=`;
    const link = message.Text.split('\n').find((line) =>
      line.startsWith(prefix),
    );
    expect(link).toBeDefined();
    const token = new URL(link as string).searchParams.get('token') as string;
    const { iat, exp } = jwtPayload(token) as { iat: number; exp: number };
    expect(Math.abs(exp - iat - 24 * 60 * 60)).toBeLessThanOrEqual(60);

    const whole = [message.Text, message.HTML, JSON.stringify(message.Headers)];
    for (const part of whole) expect(part).not.toContain(password);
    expect(await bullValues(redis)).not.toContain(password);
  });

  it('o job guarda id do usuário e link, nunca a senha nem o nome', async () => {
    const email = uniqueEmail('job');
    // Gerada em tempo de execução: um literal com cara de chave vira falso positivo do gitleaks.
    const password = `Job${randomUUID().slice(0, 8)}9`;
    const response = await signUp({
      name: 'Pessoa do Job',
      email,
      password,
    }).expect(200);
    await waitForMessages(email);

    const values = await bullValues(redis);
    expect(values).toContain(response.body.user.id);
    expect(values).not.toContain(password);
    expect(values).not.toContain('Pessoa do Job');
  });
});

describe('Cadastro com a fila de e-mail fora do ar (integração, dublê de fila que falha)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const queue = new FailingEmailQueue();

  beforeAll(async () => {
    app = await createTestApp({ override: withFailingEmailQueue(queue) });
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('cria a conta pendente e responde 200 mesmo sem conseguir enfileirar', async () => {
    const email = uniqueEmail('sem-fila');
    const response = await withClientIp(
      request(app.getHttpServer()).post('/api/auth/sign-up/email'),
    )
      .send({ name: 'Sem Fila', email, password: 'senha1234' })
      .expect(200);

    expect(response.body.user).toMatchObject({ email, emailVerified: false });
    expect(queue.attempts).toEqual([
      expect.objectContaining({
        kind: 'verify-email',
        userId: response.body.user.id,
      }),
    ]);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.role).toBe('user');
    expect(user.emailVerified).toBe(false);
  });
});
