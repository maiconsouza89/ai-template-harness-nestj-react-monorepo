import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { configureApp } from '../http/configure-app.js';
import type { HealthState } from './health-indicator.js';
import { HealthController } from './health.controller.js';
import { PostgresHealthIndicator } from './postgres-health.indicator.js';
import { ValkeyHealthIndicator } from './valkey-health.indicator.js';

/** Sobe só o controller com os dois indicadores trocados por dublês de valor fixo. */
async function appWith(postgres: HealthState, valkey: HealthState) {
  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [PostgresHealthIndicator, ValkeyHealthIndicator],
  })
    .overrideProvider(PostgresHealthIndicator)
    .useValue({ check: async () => postgres })
    .overrideProvider(ValkeyHealthIndicator)
    .useValue({ check: async () => valkey })
    .compile();

  const app = configureApp(
    moduleRef.createNestApplication<INestApplication<App>>(),
  );
  await app.init();
  return app;
}

describe('HealthController', () => {
  let app: INestApplication<App>;

  afterEach(async () => {
    await app.close();
  });

  it('responde 200 com status ok quando PostgreSQL e Valkey estão de pé', async () => {
    app = await appWith('up', 'up');
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok', checks: { postgres: 'up', valkey: 'up' } });
  });

  it('responde 503 com valkey down quando só o Valkey não responde', async () => {
    app = await appWith('up', 'down');
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(503)
      .expect({ status: 'error', checks: { postgres: 'up', valkey: 'down' } });
  });

  it('responde 503 com postgres down quando só o PostgreSQL não responde', async () => {
    app = await appWith('down', 'up');
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(503)
      .expect({ status: 'error', checks: { postgres: 'down', valkey: 'up' } });
  });

  it('fica fora do versionamento: /api/v1/health não existe', async () => {
    app = await appWith('up', 'up');
    await request(app.getHttpServer()).get('/api/v1/health').expect(404);
  });
});
