import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { ENV } from '../../src/platform/config/config.module.js';
import type { Env } from '../../src/platform/config/env.js';
import { createTestApp } from '../create-test-app.js';
import { withClientIp } from '../http/client-ip.js';

describe('App (integração)', () => {
  let app: INestApplication<App>;
  let env: Env;

  beforeAll(async () => {
    app = await createTestApp();
    env = app.get<Env>(ENV);
  });

  afterAll(async () => {
    await app.close();
  });

  it('não responde fora do prefixo /api', async () => {
    await request(app.getHttpServer()).get('/').expect(404);
    await request(app.getHttpServer()).get('/api/v1').expect(404);
  });

  it('expõe GET /api/health anônima e fora do versionamento, com o estado de cada dependência', async () => {
    // Com os serviços do Compose no ar responde 200; sem eles, 503. A forma do corpo é a mesma.
    const response = await request(app.getHttpServer()).get('/api/health');
    expect([200, 503]).toContain(response.status);
    expect(response.body).toEqual({
      status: response.status === 200 ? 'ok' : 'error',
      checks: {
        postgres: expect.stringMatching(/^(up|down)$/),
        valkey: expect.stringMatching(/^(up|down)$/),
      },
    });
    await request(app.getHttpServer()).get('/api/v1/health').expect(404);
  });

  it('devolve um x-request-id único por requisição, que não é inteiro', async () => {
    const first = await request(app.getHttpServer()).get('/api/health');
    const second = await request(app.getHttpServer()).get('/api/health');
    expect(first.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(second.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.headers['x-request-id']).not.toBe(
      second.headers['x-request-id'],
    );
  });

  it('publica o documento OpenAPI fora de produção, com as rotas sob /api e a versão', async () => {
    const json = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    expect(json.body.openapi).toMatch(/^3\./);
    expect(Object.keys(json.body.paths)).toEqual(
      expect.arrayContaining(['/api/v1/session', '/api/health']),
    );
    await request(app.getHttpServer())
      .get('/api/docs')
      .expect(200)
      .expect('Content-Type', /html/);
  });

  it('monta o Better Auth em /api/auth, anônimo: GET /api/auth/ok responde 200', async () => {
    await withClientIp(request(app.getHttpServer()).get('/api/auth/ok'))
      .expect(200)
      .expect({ ok: true });
  });

  it('recusa com 401 a rota protegida sem cookie, sem vazar dado de conta', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/session')
      .expect(401);
    const body = JSON.stringify(response.body);
    expect(body).not.toMatch(/userId|role|email/);
  });

  it('recusa com 401 um cookie de sessão de valor inventado', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/session')
      .set('Cookie', 'better-auth.session_token=valor-inventado')
      .expect(401);
  });

  it('aceita CORS com credenciais só da origem da SPA (WEB_ORIGIN)', async () => {
    const allowed = await request(app.getHttpServer())
      .options('/api/v1/session')
      .set('Origin', env.WEB_ORIGIN)
      .set('Access-Control-Request-Method', 'GET');
    expect(allowed.headers['access-control-allow-origin']).toBe(env.WEB_ORIGIN);
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');

    const denied = await request(app.getHttpServer())
      .options('/api/v1/session')
      .set('Origin', 'http://outra-origem.example')
      .set('Access-Control-Request-Method', 'GET');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});
