import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';

/**
 * Cliente Prisma 7 (ADR-0008) ligado ao PostgreSQL (ADR-0007) pelo driver adapter `pg`, apontado
 * para `DATABASE_URL`. Conecta na primeira consulta, não na subida: a API fica no ar com o banco
 * fora e `GET /api/health` informa `postgres: down`. O adapter trata os erros do pool, então uma
 * conexão derrubada pelo servidor não vira exceção não tratada.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(ENV) env: Env) {
    super({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
