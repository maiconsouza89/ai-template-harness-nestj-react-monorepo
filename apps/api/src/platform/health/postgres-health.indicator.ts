import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { probeHealth, type HealthState } from './health-indicator.js';

/** Verifica o PostgreSQL com `SELECT 1` pela conexão do `PrismaService`. */
@Injectable()
export class PostgresHealthIndicator {
  constructor(private readonly prisma: PrismaService) {}

  check(): Promise<HealthState> {
    return probeHealth(() => this.prisma.$queryRaw`SELECT 1`);
  }
}
