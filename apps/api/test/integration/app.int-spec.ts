import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/platform/http/configure-app.js';

describe('App (integração)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = configureApp(moduleFixture.createNestApplication());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('responde sob o prefixo /api e a versão /v1', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect('Hello World!');
  });

  it('não responde fora do prefixo /api/v1', () => {
    return request(app.getHttpServer()).get('/').expect(404);
  });

  it('expõe GET /api/health fora do versionamento, com o estado de cada dependência', async () => {
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
});
