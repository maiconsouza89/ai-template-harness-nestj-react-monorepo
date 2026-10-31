import { Module } from '@nestjs/common';
import { AccountsModule } from './modules/accounts/accounts.module.js';
import { EmailModule } from './modules/email/email.module.js';
import { ConfigModule } from './platform/config/config.module.js';
import { HealthModule } from './platform/health/health.module.js';
import { LoggingModule } from './platform/logging/logging.module.js';
import { PrismaModule } from './platform/prisma/prisma.module.js';
import { QueueModule } from './platform/queue/queue.module.js';
import { RedisModule } from './platform/redis/redis.module.js';

/** Raiz: infraestrutura transversal em `platform/` e um módulo por funcionalidade em `modules/`. */
@Module({
  imports: [
    ConfigModule,
    LoggingModule,
    PrismaModule,
    RedisModule,
    QueueModule,
    HealthModule,
    EmailModule,
    AccountsModule,
  ],
})
export class AppModule {}
