import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';
import { setTimeout as sleep } from 'node:timers/promises';
import type { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PARAMS_PROVIDER_TOKEN } from 'nestjs-pino';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { EMAIL_SEND_QUEUE } from '../../src/modules/email/infra/queue/email-send.queue.js';
import { createPinoHttpOptions } from '../../src/platform/logging/logger.js';
import { createTestApp, isolatedEmailQueue } from '../create-test-app.js';
import {
  confirmationTokens,
  latestConfirmationToken,
} from '../factories/user.factory.js';
import { deleteMessagesTo } from '../mailpit.js';

/**
 * Privacidade dos logs da confirmação e do reenvio (spec, Estratégia de testes; PRD, Compliance;
 * ADR-0018), no mesmo arranjo de `sign-up-logs.int-spec.ts`: a aplicação de teste sobe com as
 * opções de log da API no nível `debug`, escrevendo em memória, o console entra na captura e a
 * fila usa um prefixo próprio do BullMQ, para as linhas do worker caírem na mesma captura. Cada
 * caso confere que nenhuma linha escrita durante ele traz o token, o e-mail nem o nome da conta.
 */
function expectNoneContains(written: string[], secrets: string[]) {
  for (const secret of secrets) {
    const leaking = written.filter((line) => line.includes(secret));
    expect(leaking, `linhas de log com "${secret}"`).toEqual([]);
  }
}

describe('Logs da confirmação de e-mail (integração)', () => {
  let app: INestApplication<App>;
  let queue: Queue;
  const lines: string[] = [];
  const created = new Set<string>();

  async function linesSince(start: number): Promise<string[]> {
    await sleep(200);
    return lines.slice(start);
  }

  async function signUp(ip: string, name: string) {
    const email = `pia-${randomUUID().slice(0, 8)}@example.com`;
    created.add(email);
    await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .set('X-Forwarded-For', ip)
      .send({ name, email, password: 'Segura123' })
      .expect(200);
    return { email, token: await latestConfirmationToken(email) };
  }

  function verify(token: string) {
    return request(app.getHttpServer())
      .get(`/api/auth/verify-email?token=${token}`)
      .set('X-Forwarded-For', '203.0.113.89');
  }

  beforeAll(async () => {
    const sink = new Writable({
      write(chunk, _encoding, callback) {
        lines.push(String(chunk));
        callback();
      },
    });
    app = await createTestApp((builder) =>
      isolatedEmailQueue(`bull-verify-logs-${randomUUID()}`)(
        builder.overrideProvider(PARAMS_PROVIDER_TOKEN).useValue({
          pinoHttp: [createPinoHttpOptions({ LOG_LEVEL: 'debug' }), sink],
        }),
      ),
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

  it('a confirmação e a reabertura do link não escrevem token, e-mail nem nome', async () => {
    const { email, token } = await signUp('203.0.113.80', 'Pia Torres');
    const start = lines.length;

    await verify(token).expect(200);
    await verify(token).expect(200);
    // As rotas do Better Auth não passam pelo log de acesso do pino-http; a linha da saúde
    // mostra que a captura estava ligada durante o caso.
    await request(app.getHttpServer()).get('/api/health');

    const written = await linesSince(start);
    expect(written.some((line) => line.includes('/api/health'))).toBe(true);
    expectNoneContains(written, [token, email, 'Pia Torres', 'token=']);
  });

  it('o link adulterado ou ausente não escreve o token', async () => {
    const { email, token } = await signUp('203.0.113.81', 'Pia Torres');
    const start = lines.length;

    await verify(`${token}x`).expect(401);
    await request(app.getHttpServer())
      .get('/api/auth/verify-email')
      .set('X-Forwarded-For', '203.0.113.89')
      .expect(401);

    const written = await linesSince(start);
    expectNoneContains(written, [token, `${token}x`, email, 'Pia Torres']);
  });

  it('o reenvio, até a entrega do e-mail, não escreve token, e-mail nem nome', async () => {
    const { email, token } = await signUp('203.0.113.82', 'Pia Torres');
    const start = lines.length;

    await request(app.getHttpServer())
      .post('/api/auth/send-verification-email')
      .set('X-Forwarded-For', '203.0.113.83')
      .send({ email })
      .expect(200);
    const [resent] = await confirmationTokens(email, { messages: 2 });

    const written = await linesSince(start);
    expectNoneContains(written, [
      token,
      resent!,
      email,
      'Pia Torres',
      'token=',
    ]);
  });
});
