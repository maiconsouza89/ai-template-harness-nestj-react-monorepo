import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import type { ConnectionOptions } from 'bullmq';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';

/**
 * Conexão do BullMQ (ADR-0015) a partir de `REDIS_URL`: própria, e não a `REDIS` compartilhada,
 * porque o worker exige `maxRetriesPerRequest` nulo (o BullMQ o força na conexão bloqueante) e a
 * compartilhada usa 1. `enableOfflineQueue` falso faz o `add` do produtor falhar na hora com o
 * Valkey fora, em vez de segurar a resposta de quem enfileira (docs.bullmq.io, Going to
 * production); o worker usa a mesma conexão e volta a consumir sozinho quando o Valkey volta.
 */
export function createBullConnection(env: Env): ConnectionOptions {
  return { url: env.REDIS_URL, enableOfflineQueue: false };
}

/**
 * Raiz das filas do BullMQ sobre o Valkey (ADR-0014). O `BullModule.forRootAsync` é global: cada
 * módulo de funcionalidade registra a própria fila com `BullModule.registerQueue` e herda esta
 * conexão. O `@nestjs/bullmq` fecha filas e workers no `app.close()`.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({ connection: createBullConnection(env) }),
    }),
  ],
})
export class QueueModule {}
