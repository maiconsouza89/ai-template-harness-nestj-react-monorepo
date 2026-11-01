import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../platform/prisma/prisma.service.js';
import {
  EMAIL_VERIFICATION_IDENTIFIER_PREFIX,
  EmailVerificationLinks,
  emailVerificationIdentifier,
  type EmailVerificationLink,
} from '../../domain/email-verification-links.js';

/**
 * Registros de confirmação na tabela `verification` da fundação (spec, Modelo de dados), pelo
 * Prisma. A troca apaga os registros da conta por prefixo de `identifier` e `value` e grava o
 * novo numa transação, com uma trava de transação por conta no PostgreSQL: dois envios
 * simultâneos da mesma conta (cadastro e reenvio, ou dois reenvios) se enfileiram, e sobra um
 * registro só.
 */
@Injectable()
export class PrismaEmailVerificationLinksRepository extends EmailVerificationLinks {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async replaceForUser(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    const lockKey = `${EMAIL_VERIFICATION_IDENTIFIER_PREFIX}${userId}`;
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${lockKey}::text))`;
      await tx.verification.deleteMany({
        where: {
          value: userId,
          identifier: { startsWith: EMAIL_VERIFICATION_IDENTIFIER_PREFIX },
        },
      });
      await tx.verification.create({
        data: {
          id: randomUUID(),
          identifier: emailVerificationIdentifier(tokenHash),
          value: userId,
          expiresAt,
        },
      });
    });
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<EmailVerificationLink | null> {
    const row = await this.prisma.verification.findFirst({
      where: { identifier: emailVerificationIdentifier(tokenHash) },
      select: { id: true, value: true, expiresAt: true },
    });
    return row
      ? { id: row.id, userId: row.value, expiresAt: row.expiresAt }
      : null;
  }

  async deleteById(id: string): Promise<boolean> {
    const { count } = await this.prisma.verification.deleteMany({
      where: { id },
    });
    return count > 0;
  }
}
