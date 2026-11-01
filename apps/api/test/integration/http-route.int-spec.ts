import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { context, INVALID_SPAN_CONTEXT, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { type RPCMetadata, RPCType, setRPCMetadata } from '@opentelemetry/core';
import type { NextFunction, Request, Response } from 'express';
import { Logger as PinoLogger } from 'nestjs-pino';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { ENV } from '../../src/platform/config/config.module.js';
import type { Env } from '../../src/platform/config/env.js';
import {
  configureApp,
  configureAppOptionsFromEnv,
  NEST_APPLICATION_OPTIONS,
} from '../../src/platform/http/configure-app.js';

/**
 * `http.route` das rotas do Better Auth (spec da fundação, Métricas exportadas): o handler da
 * biblioteca é montado sem caminho, e a rota que a `instrumentation-http` copia para a métrica
 * `http.server.request.duration` e para o span de servidor vem do metadado RPC do contexto ativo.
 * O primeiro middleware do Express faz aqui o que a instrumentação faz ao receber a requisição:
 * cria o metadado e roda o resto da requisição dentro dele; o teste lê o que ficou gravado.
 */
describe('http.route das rotas do Better Auth (integração)', () => {
  let app: INestApplication<App>;
  const routes = new Map<string, RPCMetadata>();

  beforeAll(async () => {
    context.setGlobalContextManager(
      new AsyncLocalStorageContextManager().enable(),
    );
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<INestApplication<App>>(
      NEST_APPLICATION_OPTIONS,
    );
    app.use((req: Request, _res: Response, next: NextFunction) => {
      const metadata: RPCMetadata = {
        type: RPCType.HTTP,
        span: trace.wrapSpanContext(INVALID_SPAN_CONTEXT),
      };
      routes.set(req.url, metadata);
      context.with(setRPCMetadata(context.active(), metadata), next);
    });
    app.useLogger(app.get(PinoLogger));
    configureApp(app, configureAppOptionsFromEnv(app.get<Env>(ENV)));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    context.disable();
  });

  it('grava /api/auth/* como rota de GET /api/auth/ok', async () => {
    await request(app.getHttpServer()).get('/api/auth/ok').expect(200);
    expect(routes.get('/api/auth/ok')?.route).toBe('/api/auth/*');
  });

  it('não grava /api/auth/* numa requisição 404 fora de /api', async () => {
    await request(app.getHttpServer()).get('/rota-inexistente').expect(404);
    expect(routes.get('/rota-inexistente')?.route).not.toBe('/api/auth/*');
  });
});
