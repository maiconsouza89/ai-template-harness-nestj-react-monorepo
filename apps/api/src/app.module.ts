import { Module } from '@nestjs/common';
import { AccountsModule } from './modules/accounts/accounts.module.js';
import { ConfigModule } from './platform/config/config.module.js';
import { HealthModule } from './platform/health/health.module.js';
import { PrismaModule } from './platform/prisma/prisma.module.js';
import { RedisModule } from './platform/redis/redis.module.js';

/** Raiz: infraestrutura transversal em `platform/` e um módulo por funcionalidade em `modules/`. */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    HealthModule,
    AccountsModule,
  ],
})
export class AppModule {}
