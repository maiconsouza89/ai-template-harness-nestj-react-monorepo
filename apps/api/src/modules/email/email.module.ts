import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ENV } from '../../platform/config/config.module.js';
import type { Env } from '../../platform/config/env.js';
import { EMAIL_SEND_QUEUE, EmailQueue } from './email-queue.js';
import { EmailSendProcessor } from './infra/queue/email-send.processor.js';
import {
  createMailTransport,
  MAIL_TRANSPORT,
} from './infra/smtp/mail-transport.js';

/**
 * Módulo E-mail (HLD; ADR-0015, ADR-0017): a fila `email.send` no BullMQ sobre o Valkey, o
 * produtor `EmailQueue` que os outros módulos usam e o worker que envia por SMTP, no mesmo
 * processo da API.
 *
 * O BullMQ abre conexões próprias a partir de `REDIS_URL`, e não a `ioredis` compartilhada do
 * `RedisModule`: o worker exige `maxRetriesPerRequest` nulo (o BullMQ o força na conexão
 * bloqueante), e a compartilhada usa 1. A conexão sai com `enableOfflineQueue` falso para o
 * produtor falhar na hora com o Valkey fora, em vez de guardar o job na memória (BullMQ, Going to
 * production); o worker herda a mesma conexão da fila e, com o Valkey fora, tenta de novo a cada
 * `runRetryDelay`.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        connection: { url: env.REDIS_URL, enableOfflineQueue: false },
      }),
    }),
    BullModule.registerQueue({ name: EMAIL_SEND_QUEUE }),
  ],
  providers: [
    EmailQueue,
    EmailSendProcessor,
    { provide: MAIL_TRANSPORT, inject: [ENV], useFactory: createMailTransport },
  ],
  exports: [EmailQueue],
})
export class EmailModule {}
