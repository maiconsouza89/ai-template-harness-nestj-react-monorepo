import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import type { ConnectionOptions } from 'bullmq';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';

/**
 * Conexão do produtor do BullMQ (ADR-0015) a partir de `REDIS_URL`: própria, e não a `REDIS`
 * compartilhada, porque o worker exige `maxRetriesPerRequest` nulo (o BullMQ o força na conexão
 * bloqueante) e a compartilhada usa 1. `enableOfflineQueue` falso faz o `add` falhar na hora com
 * o Valkey fora, em vez de segurar a resposta de quem enfileira (docs.bullmq.io, Going to
 * production). Vale só para a `Queue`: o worker usa `createWorkerConnection`.
 */
export function createProducerConnection(env: Env): ConnectionOptions {
  return { url: env.REDIS_URL, enableOfflineQueue: false };
}

/**
 * Conexão do worker do BullMQ, com a fila offline do ioredis ligada (o padrão), como recomenda o
 * mesmo guia: com o Valkey reiniciando, os comandos bloqueantes do worker esperam a reconexão em
 * vez de falhar na hora e entrar num ciclo de erro e nova tentativa.
 */
export function createWorkerConnection(env: Env): ConnectionOptions {
  return { url: env.REDIS_URL };
}

/**
 * Raiz das filas do BullMQ sobre o Valkey (ADR-0014). O `BullModule.forRootAsync` é global: cada
 * módulo de funcionalidade registra a própria fila com `BullModule.registerQueue` e herda a
 * conexão do produtor; o worker troca a conexão pelas opções do `@Processor`. O `@nestjs/bullmq`
 * fecha filas e workers no `app.close()`.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({ connection: createProducerConnection(env) }),
    }),
  ],
})
export class QueueModule {}
