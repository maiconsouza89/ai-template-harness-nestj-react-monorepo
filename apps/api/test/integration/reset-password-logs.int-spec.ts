import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';
import { setTimeout as sleep } from 'node:timers/promises';
import type { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PARAMS_PROVIDER_TOKEN } from 'nestjs-pino';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { RequestEmailUseCase } from '../../src/modules/email/email.module.js';
import { EMAIL_SEND_QUEUE } from '../../src/modules/email/infra/queue/email-send.queue.js';
import { createPinoHttpOptions } from '../../src/platform/logging/logger.js';
import { createTestApp, isolatedEmailQueue } from '../create-test-app.js';
import {
  contaAtiva,
  latestResetPasswordToken,
} from '../factories/user.factory.js';
import { deleteMessagesTo } from '../mailpit.js';

/**
 * Privacidade dos logs da recuperação de senha (spec, Estratégia de testes; PRD, Compliance;
 * ADR-0018), no mesmo arranjo de `verify-email-logs.int-spec.ts`: a aplicação de teste sobe com as
 * opções de log da API no nível `debug`, escrevendo em memória, o console entra na captura e a
 * fila usa um prefixo próprio do BullMQ, para as linhas do worker caírem na mesma captura. Cada
 * caso confere que nenhuma linha escrita durante ele traz o token, a senha, o e-mail nem o nome.
 */
function expectNoneContains(written: string[], secrets: string[]) {
  for (const secret of secrets) {
    const leaking = written.filter((line) => line.includes(secret));
    expect(leaking, `linhas de log com "${secret}"`).toEqual([]);
  }
}

describe('Logs da recuperação de senha (integração)', () => {
  let app: INestApplication<App>;
  let queue: Queue;
  const lines: string[] = [];
  const created = new Set<string>();

  async function linesSince(start: number): Promise<string[]> {
    await sleep(200);
    return lines.slice(start);
  }

  async function account(handle: string, name: string) {
    const email = `${handle}-${randomUUID().slice(0, 8)}@example.com`;
    created.add(email);
    return contaAtiva(app, { email, name });
  }

  function requestReset(ip: string, email: string) {
    return request(app.getHttpServer())
      .post('/api/auth/request-password-reset')
      .set('X-Forwarded-For', ip)
      .send({ email });
  }

  beforeAll(async () => {
    const sink = new Writable({
      write(chunk, _encoding, callback) {
        lines.push(String(chunk));
        callback();
      },
    });
    app = await createTestApp((builder) =>
      isolatedEmailQueue(`bull-reset-logs-${randomUUID()}`)(
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

  it('o pedido, até a entrega do e-mail, não escreve token, e-mail nem nome (API-SIGILO-01)', async () => {
    const bia = await account('bia', 'Bia Nunes');
    const start = lines.length;

    await requestReset('203.0.113.150', bia.email).expect(200);
    const token = await latestResetPasswordToken(bia.email);
    // As rotas do Better Auth não passam pelo log de acesso do pino-http; a linha da saúde
    // mostra que a captura estava ligada durante o caso.
    await request(app.getHttpServer()).get('/api/health');

    const written = await linesSince(start);
    expect(written.some((line) => line.includes('/api/health'))).toBe(true);
    expectNoneContains(written, [token, bia.email, 'Bia Nunes', 'token=']);
  });

  it('o pedido de e-mail sem conta e o de fila fora não escrevem o e-mail', async () => {
    const missing = `sem.conta-${randomUUID().slice(0, 8)}@example.com`;
    const bela = await account('bela', 'Bela Prado');
    const start = lines.length;

    await requestReset('203.0.113.151', missing).expect(200);
    const requestEmail = app.get(RequestEmailUseCase, { strict: false });
    const execute = vi
      .spyOn(requestEmail, 'execute')
      .mockRejectedValueOnce(new Error(`fila fora para ${bela.email}`));
    await requestReset('203.0.113.151', bela.email).expect(200);
    execute.mockRestore();

    const written = await linesSince(start);
    expect(
      written.some((line) => line.includes('falha ao pedir o e-mail')),
    ).toBe(true);
    expectNoneContains(written, [missing, bela.email, 'Bela Prado']);
  });

  it('a checagem e a troca não escrevem token, senha, e-mail nem nome (API-SIGILO-02)', async () => {
    const bruno = await account('bruno', 'Bruno Reis');
    await requestReset('203.0.113.152', bruno.email).expect(200);
    const t1 = await latestResetPasswordToken(bruno.email);
    const start = lines.length;

    await request(app.getHttpServer())
      .get(`/api/auth/reset-password-status?token=${t1}`)
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({ token: t1, newPassword: 'semnumero' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({ token: t1, newPassword: 'Sigilo12345' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({ token: t1, newPassword: 'Sigilo12345' })
      .expect(400);
    await request(app.getHttpServer())
      .get(`/api/auth/reset-password-status?token=${t1}`)
      .expect(400);

    const written = await linesSince(start);
    expectNoneContains(written, [
      t1,
      'Sigilo12345',
      'semnumero',
      bruno.email,
      'Bruno Reis',
      'token=',
    ]);
  });
});
