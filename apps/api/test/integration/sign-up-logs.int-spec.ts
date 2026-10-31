import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';
import { setTimeout as sleep } from 'node:timers/promises';
import type { INestApplication } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { getQueueOptionsToken, getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PARAMS_PROVIDER_TOKEN } from 'nestjs-pino';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createAuthLog } from '../../src/modules/accounts/accounts.module.js';
import { EMAIL_SEND_QUEUE } from '../../src/modules/email/infra/queue/email-send.queue.js';
import { loadEnv } from '../../src/platform/config/env.js';
import { createPinoHttpOptions } from '../../src/platform/logging/logger.js';
import { PrismaService } from '../../src/platform/prisma/prisma.service.js';
import { createBullConnection } from '../../src/platform/queue/queue.module.js';
import { createTestApp } from '../create-test-app.js';
import { deleteMessagesTo, waitForMessagesTo } from '../mailpit.js';

/**
 * Privacidade dos logs do cadastro (spec, Estratégia de testes; PRD, Compliance; ADR-0018): a
 * aplicação de teste sobe com as opções de log da API no nível `debug`, escrevendo em memória em
 * vez de no stdout, e cada caso confere que nenhuma linha escrita durante ele (requisição, hook,
 * Better Auth, callback de confirmação, produtor e worker da fila) traz a senha, o nome, o e-mail
 * nem o token do link. O console também entra na captura, porque o Better Auth escreve nele
 * quando uma linha escapa do logger configurado. A fila usa um prefixo próprio do BullMQ, para o
 * worker desta aplicação entregar o e-mail e as linhas dele caírem na mesma captura.
 */
function expectNoneContains(written: string[], secrets: string[]) {
  for (const secret of secrets) {
    const leaking = written.filter((line) => line.includes(secret));
    expect(leaking, `linhas de log com "${secret}"`).toEqual([]);
  }
}

describe('Logs do cadastro (integração)', () => {
  let app: INestApplication<App>;
  let queue: Queue;
  const lines: string[] = [];
  const created = new Set<string>();

  /** Linhas escritas a partir de `start`, depois de dar tempo à escrita assíncrona do pino. */
  async function linesSince(start: number): Promise<string[]> {
    await sleep(200);
    return lines.slice(start);
  }

  function signUp(ip: string, body: Record<string, string>) {
    created.add(body.email.toLowerCase());
    return request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .set('X-Forwarded-For', ip)
      .send(body);
  }

  beforeAll(async () => {
    const env = loadEnv();
    const sink = new Writable({
      write(chunk, _encoding, callback) {
        lines.push(String(chunk));
        callback();
      },
    });
    app = await createTestApp((builder) =>
      builder
        .overrideProvider(PARAMS_PROVIDER_TOKEN)
        .useValue({
          pinoHttp: [createPinoHttpOptions({ LOG_LEVEL: 'debug' }), sink],
        })
        .overrideProvider(getQueueOptionsToken(EMAIL_SEND_QUEUE))
        .useValue({
          name: EMAIL_SEND_QUEUE,
          connection: createBullConnection(env),
          prefix: `bull-logs-${randomUUID()}`,
        }),
    );
    queue = app.get<Queue>(getQueueToken(EMAIL_SEND_QUEUE));
    for (const method of ['debug', 'info', 'log', 'warn', 'error'] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        lines.push(args.map((arg) => String(arg)).join(' '));
      });
    }
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await Promise.all([...created].map(deleteMessagesTo));
    await queue.obliterate({ force: true });
    await app.close();
  }, 30_000);

  it('captura as linhas da aplicação', async () => {
    const start = lines.length;
    await request(app.getHttpServer()).get('/api/health');
    const written = await linesSince(start);
    expect(written.some((line) => line.includes('/api/health'))).toBe(true);
  });

  it('um cadastro completo, até a entrega do e-mail, não escreve senha, nome, e-mail nem token', async () => {
    const email = `zelia-${randomUUID().slice(0, 8)}@example.com`;
    const name = 'Zélia Dias';
    const password = 'Jornada123';
    const start = lines.length;

    await signUp('203.0.113.30', { name, email, password }).expect(200);
    const messages = await waitForMessagesTo(email);
    expect(messages).toHaveLength(1);
    const token = /confirmar-email\?token=([^\s"&]+)/.exec(
      messages[0].Text,
    )?.[1];
    expect(token).toBeTruthy();

    const written = await linesSince(start);
    expectNoneContains(written, [
      password,
      name,
      email,
      'token=',
      token as string,
    ]);
  });

  it('o cadastro recusado por e-mail existente não escreve a senha nem o e-mail', async () => {
    const email = `ana-${randomUUID().slice(0, 8)}@example.com`;
    await signUp('203.0.113.31', {
      name: 'Ana Souza',
      email,
      password: 'Segura123',
    }).expect(200);
    const start = lines.length;

    await signUp('203.0.113.32', {
      name: 'Outra Ana',
      email: email.toUpperCase(),
      password: 'Sigilo789z',
    }).expect(422);

    const written = await linesSince(start);
    expectNoneContains(written, [
      'Sigilo789z',
      'Outra Ana',
      email,
      email.toUpperCase(),
    ]);
  });

  it('o cadastro recusado pela regra de senha não escreve a senha, o nome nem o e-mail', async () => {
    const email = `kai-${randomUUID().slice(0, 8)}@example.com`;
    const start = lines.length;

    await signUp('203.0.113.33', {
      name: 'Kai Duarte',
      email,
      password: 'semnumero',
    }).expect(400);

    const written = await linesSince(start);
    expectNoneContains(written, ['semnumero', 'Kai Duarte', email]);
  });

  it('cadastros simultâneos do mesmo e-mail não escrevem o e-mail nem a senha', async () => {
    // Na corrida, o hook deixa passar mais de um pedido e a constraint única recusa os demais,
    // que o Better Auth registra como "Failed to create user" com o erro do Prisma.
    const email = `corrida-${randomUUID().slice(0, 8)}@example.com`;
    const start = lines.length;

    const responses = await Promise.all(
      ['203.0.113.34', '203.0.113.35', '203.0.113.36', '203.0.113.37'].map(
        (ip) =>
          signUp(ip, { name: 'Rita Corrida', email, password: 'Corrida123' }),
      ),
    );
    expect(responses.filter((r) => r.status === 200)).toHaveLength(1);

    const written = await linesSince(start);
    expectNoneContains(written, ['Corrida123', 'Rita Corrida', email]);
  });

  it('o erro da constraint única que o Better Auth registra na corrida sai sem o e-mail', async () => {
    // A corrida acima nem sempre acontece; aqui o mesmo erro do Prisma passa pelo encaminhamento
    // de log do Better Auth montado no Módulo Contas, de forma determinística.
    const prisma = app.get(PrismaService);
    const email = `constraint-${randomUUID().slice(0, 8)}@example.com`;
    await prisma.user.create({
      data: { id: randomUUID(), name: 'Teo Unico', email },
    });
    const error = await prisma.user
      .create({ data: { id: randomUUID(), name: 'Teo Unico', email } })
      .then(
        () => undefined,
        (reason: unknown) => reason,
      );
    expect(error).toBeInstanceOf(Error);
    const start = lines.length;

    createAuthLog(new Logger('BetterAuth'))(
      'error',
      'Failed to create user',
      error,
    );

    const written = await linesSince(start);
    expect(
      written.some((line) =>
        line.includes(
          'Failed to create user PrismaClientKnownRequestError (P2002)',
        ),
      ),
    ).toBe(true);
    expectNoneContains(written, [email, 'Teo Unico']);
    await prisma.user.deleteMany({ where: { email } });
  });
});
