import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/** Expõe o `PrismaService` para toda a aplicação: os repositórios de `infra/` de cada módulo o injetam. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
