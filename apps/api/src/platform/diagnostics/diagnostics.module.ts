import { BullModule } from '@nestjs/bullmq';
import { type DynamicModule, Module } from '@nestjs/common';
import { diagnosticsEnvSchema, type DiagnosticsEnv } from '../config/env.js';
import { DiagnosticsController } from './diagnostics.controller.js';
import { DiagnosticsProcessor } from './diagnostics.processor.js';
import { DIAGNOSTICS_QUEUE } from './diagnostics.queue.js';

/**
 * Lê as variáveis da fila de diagnóstico sem validar o resto da configuração e sem lançar: valor
 * inválido conta como desligado aqui, e o `main.ts` derruba a subida nomeando a variável.
 */
export function readDiagnosticsEnv(
  source: Record<string, string | undefined> = process.env,
): DiagnosticsEnv | undefined {
  const result = diagnosticsEnvSchema.safeParse(source);
  return result.success ? result.data : undefined;
}

/** A fila e a rota de diagnóstico existem só com `DIAGNOSTICS_ENABLED=true` fora de produção. */
export function isDiagnosticsEnabled(
  env: DiagnosticsEnv | undefined,
): env is DiagnosticsEnv {
  return (
    env !== undefined &&
    env.DIAGNOSTICS_ENABLED &&
    env.NODE_ENV !== 'production'
  );
}

/**
 * Fila de diagnóstico (spec da fundação, Observabilidade): exercita o trace e as métricas de fila
 * da plataforma sem depender de módulo de funcionalidade. Desligado, o módulo fica vazio: sem
 * rota (`POST /api/diagnostics/jobs` responde 404), sem fila e sem worker. Ligado, registra a
 * fila `diagnostics`, a rota e, salvo `DIAGNOSTICS_WORKER_ENABLED=false`, o worker.
 *
 * A decisão sai de `process.env` na importação do `app.module.ts`, porque a lista de módulos do
 * Nest é fixada antes da injeção da configuração validada.
 */
@Module({})
export class DiagnosticsModule {
  static register(
    source: Record<string, string | undefined> = process.env,
  ): DynamicModule {
    const env = readDiagnosticsEnv(source);
    if (!isDiagnosticsEnabled(env)) {
      return { module: DiagnosticsModule };
    }
    return {
      module: DiagnosticsModule,
      imports: [BullModule.registerQueue({ name: DIAGNOSTICS_QUEUE })],
      controllers: [DiagnosticsController],
      providers: env.DIAGNOSTICS_WORKER_ENABLED ? [DiagnosticsProcessor] : [],
    };
  }
}
