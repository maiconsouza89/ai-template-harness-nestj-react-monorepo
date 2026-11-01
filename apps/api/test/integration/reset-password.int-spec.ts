import { createHash, randomUUID } from 'node:crypto';
import { resetPasswordMessages, signUpMessages } from '@app/contracts';
import type { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PASSWORD_RESET_IDENTIFIER_PREFIX } from '../../src/modules/accounts/domain/password-reset-links.js';
import { RequestEmailUseCase } from '../../src/modules/email/email.module.js';
import { EMAIL_SEND_QUEUE } from '../../src/modules/email/infra/queue/email-send.queue.js';
import { PrismaService } from '../../src/platform/prisma/prisma.service.js';
import { createTestApp, isolatedEmailQueue } from '../create-test-app.js';
import { cookieHeaderFrom } from '../factories/session.factory.js';
import {
  CONTA_ATIVA_PASSWORD,
  contaAtiva,
  latestResetPasswordToken,
  movePasswordResetExpiry,
  passwordResetRecordsOf,
  resetPasswordTokens,
} from '../factories/user.factory.js';
import { deleteMessagesTo } from '../mailpit.js';

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const NEUTRAL_BODY = {
  status: true,
  message:
    'If this email exists in our system, check your email for the reset link',
};

/**
 * Recuperação de senha do RF-005 em `POST /api/auth/request-password-reset`,
 * `GET /api/auth/reset-password-status` e `POST /api/auth/reset-password`, com o banco app_test,
 * o Valkey e o Mailpit do Compose. Cada caso cria a `conta-ativa` com a factory e lê o token do
 * link no e-mail "Redefina sua senha" que chegou à caixa (`latestResetPasswordToken`); o
 * vencimento se move no registro de recuperação (`movePasswordResetExpiry`). Os pedidos vão com
 * um `X-Forwarded-For` próprio da faixa 203.0.113.0/24 e cada entrada com um da 198.51.100.0/24;
 * o `createTestApp` apaga os contadores do rate limit na subida, o que garante
 * `janela-de-recuperacao-livre` e `janela-de-cadastro-livre`. A fila usa um prefixo próprio do
 * BullMQ, para o worker desta aplicação entregar os e-mails.
 */
describe('Recuperação de senha (integração, banco app_test)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let queue: Queue;
  const created = new Set<string>();
  let signInIp = 10;

  function uniqueEmail(handle: string): string {
    const email = `${handle}-${randomUUID().slice(0, 8)}@example.com`;
    created.add(email);
    return email;
  }

  async function account(handle: string, name = 'Rosa Lima') {
    return contaAtiva(app, { email: uniqueEmail(handle), name });
  }

  function requestReset(ip: string, email: string) {
    return request(app.getHttpServer())
      .post('/api/auth/request-password-reset')
      .set('X-Forwarded-For', ip)
      .send({ email });
  }

  /** Pede o link e devolve o token da mensagem mais recente, depois de `messages` mensagens. */
  async function requestToken(ip: string, email: string, messages = 1) {
    await requestReset(ip, email).expect(200);
    return latestResetPasswordToken(email, { messages });
  }

  function status(token: string | undefined) {
    const query = token === undefined ? '' : `?token=${token}`;
    return request(app.getHttpServer())
      .get(`/api/auth/reset-password-status${query}`)
      .set('X-Forwarded-For', '203.0.113.159');
  }

  function resetPassword(token: string, newPassword: string) {
    return request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .set('X-Forwarded-For', '203.0.113.158')
      .send({ token, newPassword });
  }

  /** Entrada pela rota nativa com um IP de documentação exclusivo desta requisição. */
  function signIn(email: string, password: string) {
    signInIp += 1;
    return request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .set('X-Forwarded-For', `198.51.100.${signInIp}`)
      .send({ email, password });
  }

  async function credentialHash(userId: string) {
    const credential = await prisma.account.findFirstOrThrow({
      where: { userId, providerId: 'credential' },
      select: { password: true },
    });
    return credential.password;
  }

  function records(userId: string) {
    return prisma.verification.findMany({
      where: passwordResetRecordsOf(userId),
    });
  }

  function sessionCount(userId: string) {
    return prisma.session.count({ where: { userId } });
  }

  function allResetRecordCount() {
    return prisma.verification.count({
      where: { identifier: { startsWith: PASSWORD_RESET_IDENTIFIER_PREFIX } },
    });
  }

  beforeAll(async () => {
    app = await createTestApp(isolatedEmailQueue(`bull-reset-${randomUUID()}`));
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

  describe('pedido', () => {
    it('grava um registro de 1 hora só com o hash do token (API-PEDIDO-01)', async () => {
      const rosa = await account('rosa');
      const response = await requestReset('203.0.113.120', rosa.email);
      const answeredAt = Date.now();
      expect(response.status).toBe(200);
      expect(response.body).toEqual(NEUTRAL_BODY);
      const token = await latestResetPasswordToken(rosa.email);

      const rows = await records(rosa.userId);
      expect(rows).toHaveLength(1);
      const [row] = rows;
      const remaining = row!.expiresAt.getTime() - answeredAt;
      expect(remaining).toBeGreaterThan(HOUR_MS - MINUTE_MS);
      expect(remaining).toBeLessThan(HOUR_MS + MINUTE_MS);
      expect(row!.identifier).toBe(
        `reset-password:${createHash('sha256').update(token).digest('hex')}`,
      );
      expect(row!.identifier).not.toContain(token);
      expect(row!.value).not.toContain(token);
    });

    it('e-mail sem conta recebe o mesmo corpo e não grava registro (API-PEDIDO-02)', async () => {
      const rui = await account('rui');
      const withAccount = await requestReset('203.0.113.121', rui.email);
      expect(withAccount.status).toBe(200);
      const before = await allResetRecordCount();

      const missing = uniqueEmail('sem.conta');
      const response = await requestReset('203.0.113.121', missing);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(withAccount.body);
      expect(await prisma.user.count({ where: { email: missing } })).toBe(0);
      expect(await allResetRecordCount()).toBe(before);
    });

    it('com a fila fora responde o mesmo corpo e mantém o link anterior (API-PEDIDO-03 e 04)', async () => {
      const sara = await account('sara');
      const first = await requestReset('203.0.113.122', sara.email);
      expect(first.status).toBe(200);
      const t1 = await latestResetPasswordToken(sara.email);
      const [r1] = await records(sara.userId);

      const requestEmail = app.get(RequestEmailUseCase, { strict: false });
      const execute = vi
        .spyOn(requestEmail, 'execute')
        .mockRejectedValueOnce(new Error('fila fora'));
      const second = await requestReset('203.0.113.122', sara.email);
      execute.mockRestore();

      expect(second.status).toBe(200);
      expect(second.body).toEqual(first.body);
      expect(await records(sara.userId)).toEqual([r1]);

      const reset = await resetPassword(t1, 'Nova12345');
      expect(reset.status).toBe(200);
      expect(reset.body).toEqual({ status: true });
      expect(await records(sara.userId)).toHaveLength(0);
    });

    it('o sexto pedido em 60 segundos do mesmo IP responde 429 com X-Retry-After (API-PEDIDO-05)', async () => {
      const tito = await account('tito');
      const ip = '203.0.113.123';
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await requestReset(ip, tito.email).expect(200);
      }
      const response = await requestReset(ip, tito.email);
      expect(response.status).toBe(429);
      expect(response.headers['x-retry-after']).toBeDefined();
    });

    it('apaga os registros vencidos de outras contas (API-LIMPEZA-01)', async () => {
      const hugo = await account('hugo');
      await requestReset('203.0.113.124', hugo.email).expect(200);
      expect(
        await movePasswordResetExpiry(
          app,
          hugo.userId,
          new Date(Date.now() - MINUTE_MS),
        ),
      ).toBe(1);
      const iris = await account('iris');

      await requestReset('203.0.113.125', iris.email).expect(200);

      expect(await records(hugo.userId)).toHaveLength(0);
      expect(await records(iris.userId)).toHaveLength(1);
    });
  });

  describe('novo pedido', () => {
    it('invalida o link anterior (API-REPEDIDO-01)', async () => {
      const tais = await account('tais');
      const t1 = await requestToken('203.0.113.126', tais.email);
      await requestToken('203.0.113.126', tais.email, 2);
      const hash = await credentialHash(tais.userId);

      const response = await resetPassword(t1, 'Nova12345');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ code: 'INVALID_TOKEN' });
      expect(await credentialHash(tais.userId)).toBe(hash);
      expect(await records(tais.userId)).toHaveLength(1);
    });

    it('o link novo troca a senha (API-REPEDIDO-02)', async () => {
      const teo = await account('teo');
      const t1 = await requestToken('203.0.113.127', teo.email);
      const t2 = await requestToken('203.0.113.127', teo.email, 2);

      const response = await resetPassword(t2, 'Nova12345');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: true });
      expect(t2).not.toBe(t1);
      expect(await records(teo.userId)).toHaveLength(0);
    });
  });

  describe('checagem do link', () => {
    it('responde válido sem consumir o registro (API-CHECAGEM-01)', async () => {
      const ugo = await account('ugo');
      const t1 = await requestToken('203.0.113.128', ugo.email);

      const response = await status(t1);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ valid: true });
      expect(await records(ugo.userId)).toHaveLength(1);
      await status(t1).expect(200);
    });

    it('recusa o link vencido (API-CHECAGEM-02)', async () => {
      const una = await account('una');
      const t1 = await requestToken('203.0.113.129', una.email);
      await movePasswordResetExpiry(
        app,
        una.userId,
        new Date(Date.now() - MINUTE_MS),
      );

      const response = await status(t1);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        code: 'INVALID_TOKEN',
        message: resetPasswordMessages.invalidToken,
      });
    });

    it('recusa o link já usado (API-CHECAGEM-03)', async () => {
      const uri = await account('uri');
      const t1 = await requestToken('203.0.113.130', uri.email);
      await resetPassword(t1, 'Nova12345').expect(200);

      const response = await status(t1);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ code: 'INVALID_TOKEN' });
    });

    it('recusa token desconhecido, ausente e o hash gravado (API-CHECAGEM-04)', async () => {
      const abc = await status('abc');
      expect(abc.status).toBe(400);
      expect(abc.body).toMatchObject({ code: 'INVALID_TOKEN' });

      const missing = await status(undefined);
      expect(missing.status).toBe(400);
      expect(missing.body).toMatchObject({ code: 'INVALID_TOKEN' });

      const ana = await account('ana-hash');
      await requestToken('203.0.113.131', ana.email);
      const [row] = await records(ana.userId);
      const storedHash = row!.identifier.slice(
        PASSWORD_RESET_IDENTIFIER_PREFIX.length,
      );
      const byHash = await status(storedHash);
      expect(byHash.status).toBe(400);
      expect(byHash.body).toMatchObject({ code: 'INVALID_TOKEN' });
    });

    it('recusa o link de conta que não existe mais', async () => {
      const gone = await account('gone');
      const t1 = await requestToken('203.0.113.132', gone.email);
      const [row] = await records(gone.userId);
      await prisma.user.delete({ where: { id: gone.userId } });

      const response = await status(t1);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ code: 'INVALID_TOKEN' });
      await prisma.verification.delete({ where: { id: row!.id } });
    });
  });

  describe('troca da senha', () => {
    it('troca a senha sem abrir sessão e consome o link (API-TROCA-01)', async () => {
      const vitor = await account('vitor');
      const t1 = await requestToken('203.0.113.133', vitor.email);
      const hash = await credentialHash(vitor.userId);

      const response = await resetPassword(t1, 'Nova12345');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: true });
      expect(response.headers['set-cookie']).toBeUndefined();
      expect(await credentialHash(vitor.userId)).not.toBe(hash);
      expect(await records(vitor.userId)).toHaveLength(0);
      expect(await sessionCount(vitor.userId)).toBe(0);
    });

    it('a senha antiga deixa de entrar e a nova entra (API-TROCA-02 e 03)', async () => {
      const vera = await account('vera');
      const t1 = await requestToken('203.0.113.134', vera.email);
      await resetPassword(t1, 'Nova12345').expect(200);

      const old = await signIn(vera.email, CONTA_ATIVA_PASSWORD);
      expect(old.status).toBe(401);
      expect(old.body).toMatchObject({ code: 'INVALID_EMAIL_OR_PASSWORD' });
      expect(old.headers['set-cookie']).toBeUndefined();

      const fresh = await signIn(vera.email, 'Nova12345');
      expect(fresh.status).toBe(200);
      expect(cookieHeaderFrom(fresh)).toContain('session_token=');
      expect(await sessionCount(vera.userId)).toBe(1);
    });

    it('o link a 1 minuto de vencer ainda troca a senha (API-TROCA-04)', async () => {
      const valter = await account('valter');
      const t1 = await requestToken('203.0.113.135', valter.email);
      await movePasswordResetExpiry(
        app,
        valter.userId,
        new Date(Date.now() + MINUTE_MS),
      );
      const hash = await credentialHash(valter.userId);

      const response = await resetPassword(t1, 'Nova12345');

      expect(response.status).toBe(200);
      expect(await credentialHash(valter.userId)).not.toBe(hash);
    });

    it('a conta pendente troca a senha e continua pendente (API-TROCA-05)', async () => {
      const email = uniqueEmail('wanda');
      const signUp = await request(app.getHttpServer())
        .post('/api/auth/sign-up/email')
        .set('X-Forwarded-For', '203.0.113.136')
        .send({ name: 'Wanda Reis', email, password: 'Segura123' })
        .expect(200);
      const userId = (signUp.body as { user: { id: string } }).user.id;
      const t1 = await requestToken('203.0.113.137', email);
      const hash = await credentialHash(userId);

      const response = await resetPassword(t1, 'Nova12345');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: true });
      expect(await credentialHash(userId)).not.toBe(hash);
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { emailVerified: true },
      });
      expect(user.emailVerified).toBe(false);
    });
  });

  describe('uso único e vencimento', () => {
    it('o link usado não troca de novo (API-USO-01)', async () => {
      const xico = await account('xico');
      const t1 = await requestToken('203.0.113.138', xico.email);
      await resetPassword(t1, 'Nova12345').expect(200);
      const hash = await credentialHash(xico.userId);

      const response = await resetPassword(t1, 'Outra12345');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ code: 'INVALID_TOKEN' });
      expect(await credentialHash(xico.userId)).toBe(hash);
    });

    it('o link vencido não troca (API-USO-02)', async () => {
      const xena = await account('xena');
      const t1 = await requestToken('203.0.113.139', xena.email);
      await movePasswordResetExpiry(
        app,
        xena.userId,
        new Date(Date.now() - MINUTE_MS),
      );
      const hash = await credentialHash(xena.userId);

      const response = await resetPassword(t1, 'Nova12345');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ code: 'INVALID_TOKEN' });
      expect(await credentialHash(xena.userId)).toBe(hash);
    });

    it('o hash gravado não serve de token', async () => {
      const xavier = await account('xavier');
      await requestToken('203.0.113.140', xavier.email);
      const [row] = await records(xavier.userId);
      const hash = await credentialHash(xavier.userId);

      const response = await resetPassword(
        row!.identifier.slice(PASSWORD_RESET_IDENTIFIER_PREFIX.length),
        'Nova12345',
      );

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ code: 'INVALID_TOKEN' });
      expect(await credentialHash(xavier.userId)).toBe(hash);
      expect(await records(xavier.userId)).toHaveLength(1);
    });

    it('duas trocas simultâneas com o mesmo link trocam uma vez (API-USO-03)', async () => {
      const ximena = await account('ximena');
      const t1 = await requestToken('203.0.113.141', ximena.email);

      const [first, second] = await Promise.all([
        resetPassword(t1, 'Nova12345'),
        resetPassword(t1, 'Outra12345'),
      ]);

      const statuses = [first.status, second.status].toSorted();
      expect(statuses).toEqual([200, 400]);
      const loser = first.status === 400 ? first : second;
      expect(loser.body).toMatchObject({ code: 'INVALID_TOKEN' });
      expect(await records(ximena.userId)).toHaveLength(0);

      const winner = first.status === 200 ? 'Nova12345' : 'Outra12345';
      const other = winner === 'Nova12345' ? 'Outra12345' : 'Nova12345';
      expect((await signIn(ximena.email, winner)).status).toBe(200);
      expect((await signIn(ximena.email, other)).status).toBe(401);
    });
  });

  describe('regra da nova senha', () => {
    it.each([
      ['sem número (API-REGRA-01)', 'yago', 'semnumero', '203.0.113.142'],
      ['sem letra (API-REGRA-02)', 'yan', '12345678', '203.0.113.143'],
      ['com 7 caracteres (API-REGRA-03)', 'yvone', 'Nova123', '203.0.113.144'],
    ])(
      'recusa a senha %s e mantém o link',
      async (_case, handle, newPassword, ip) => {
        const conta = await account(handle);
        const t1 = await requestToken(ip, conta.email);
        const hash = await credentialHash(conta.userId);

        const response = await resetPassword(t1, newPassword);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          code: 'VALIDATION_ERROR',
          message: resetPasswordMessages.validation,
          fields: [
            { field: 'newPassword', message: signUpMessages.passwordRule },
          ],
        });
        expect(await credentialHash(conta.userId)).toBe(hash);
        expect(await records(conta.userId)).toHaveLength(1);
        await status(t1).expect(200);
      },
    );
  });

  describe('sessões depois da troca', () => {
    it('apaga todas as sessões da conta (API-SESSAO-01)', async () => {
      const zeno = await account('zeno');
      await signIn(zeno.email, CONTA_ATIVA_PASSWORD).expect(200);
      await signIn(zeno.email, CONTA_ATIVA_PASSWORD).expect(200);
      expect(await sessionCount(zeno.userId)).toBe(2);
      const t1 = await requestToken('203.0.113.145', zeno.email);

      const response = await resetPassword(t1, 'Nova12345');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: true });
      expect(await sessionCount(zeno.userId)).toBe(0);
    });

    it('a sessão aberta antes deixa de ter acesso (API-SESSAO-02)', async () => {
      const zuleica = await account('zuleica');
      const c1 = cookieHeaderFrom(
        await signIn(zuleica.email, CONTA_ATIVA_PASSWORD).expect(200),
      );
      await request(app.getHttpServer())
        .get('/api/v1/session')
        .set('Cookie', c1)
        .expect(200);
      const t1 = await requestToken('203.0.113.146', zuleica.email);
      await resetPassword(t1, 'Nova12345').expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/v1/session')
        .set('Cookie', c1);

      expect(response.status).toBe(401);
      expect(JSON.stringify(response.body)).not.toContain(zuleica.userId);
    });
  });

  it('o e-mail de recuperação leva o link da SPA a quem pediu (WRK-EMAIL-01)', async () => {
    const zilda = await account('zilda', 'Zilda Rocha');
    await requestReset('203.0.113.147', zilda.email).expect(200);

    const [token] = await resetPasswordTokens(zilda.email);
    expect(token).toMatch(/^[A-Za-z0-9]{24}$/);
  });
});
