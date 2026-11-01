import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { configureApp } from '../http/configure-app.js';
import { DiagnosticsController } from './diagnostics.controller.js';
import {
  DIAGNOSTICS_JOB_NAME,
  DIAGNOSTICS_JOB_OPTIONS,
  DIAGNOSTICS_QUEUE,
} from './diagnostics.queue.js';

describe('DiagnosticsController', () => {
  let app: INestApplication<App>;
  const add = vi.fn();

  beforeEach(async () => {
    add.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [DiagnosticsController],
      providers: [
        { provide: getQueueToken(DIAGNOSTICS_QUEUE), useValue: { add } },
      ],
    }).compile();
    app = configureApp(
      moduleRef.createNestApplication<INestApplication<App>>(),
    );
    await app.init();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  it('responde 202 com o jobId e enfileira só o outcome', async () => {
    add.mockResolvedValue({ id: '7' });

    await request(app.getHttpServer())
      .post('/api/diagnostics/jobs')
      .send({ outcome: 'fail' })
      .expect(202)
      .expect({ jobId: '7' });

    expect(add).toHaveBeenCalledWith(
      DIAGNOSTICS_JOB_NAME,
      { outcome: 'fail' },
      DIAGNOSTICS_JOB_OPTIONS,
    );
  });

  it('responde 400 sem enfileirar com outcome desconhecido', async () => {
    await request(app.getHttpServer())
      .post('/api/diagnostics/jobs')
      .send({ outcome: 'explodir' })
      .expect(400);

    expect(add).not.toHaveBeenCalled();
  });

  it('responde 400 sem enfileirar sem corpo', async () => {
    await request(app.getHttpServer())
      .post('/api/diagnostics/jobs')
      .expect(400);

    expect(add).not.toHaveBeenCalled();
  });

  it('responde 503 quando a fila recusa o job', async () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    add.mockRejectedValue(new Error('Connection is closed.'));

    await request(app.getHttpServer())
      .post('/api/diagnostics/jobs')
      .send({ outcome: 'succeed' })
      .expect(503);
  });

  it('fica fora do versionamento: /api/v1/diagnostics/jobs não existe', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/diagnostics/jobs')
      .send({ outcome: 'succeed' })
      .expect(404);
  });
});
