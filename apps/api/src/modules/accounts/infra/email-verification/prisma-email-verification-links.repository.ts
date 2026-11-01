import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../platform/prisma/prisma.service.js';
import {
  type CreatedEmailVerificationLink,
  EMAIL_VERIFICATION_IDENTIFIER_PREFIX,
  EmailVerificationLinks,
  emailVerificationIdentifier,
  type EmailVerificationLink,
} from '../../domain/email-verification-links.js';

/** Filtro dos registros de confirmação entre as linhas da tabela `verification`. */
const EMAIL_VERIFICATION_RECORDS = {
  identifier: { startsWith: EMAIL_VERIFICATION_IDENTIFIER_PREFIX },
};

/**
 * Registros de confirmação na tabela `verification` da fundação (spec, Modelo de dados), pelo
 * Prisma. Cada operação é um comando só, sem transação nem trava: os anteriores de um registro
 * são os da mesma conta com `createdAt` menor, então dois envios simultâneos da mesma conta não
 * apagam o registro um do outro, e o mais novo sobrevive ao envio seguinte.
 */
@Injectable()
export class PrismaEmailVerificationLinksRepository extends EmailVerificationLinks {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<CreatedEmailVerificationLink> {
    const row = await this.prisma.verification.create({
      data: {
        id: randomUUID(),
        identifier: emailVerificationIdentifier(tokenHash),
        value: userId,
        expiresAt,
      },
      select: { id: true, value: true, createdAt: true },
    });
    return { id: row.id, userId: row.value, createdAt: row.createdAt };
  }

  async deleteOlderForUser(
    link: CreatedEmailVerificationLink,
  ): Promise<number> {
    const { count } = await this.prisma.verification.deleteMany({
      where: {
        ...EMAIL_VERIFICATION_RECORDS,
        value: link.userId,
        createdAt: { lt: link.createdAt },
        id: { not: link.id },
      },
    });
    return count;
  }

  /**
   * O `deleteMany` do Prisma não tem limite: busca os ids do lote e apaga por eles. Um envio
   * simultâneo que apague parte do mesmo lote não atrapalha, só reduz a contagem.
   */
  async deleteExpiredBefore(cutoff: Date, limit: number): Promise<number> {
    const rows = await this.prisma.verification.findMany({
      where: { ...EMAIL_VERIFICATION_RECORDS, expiresAt: { lt: cutoff } },
      select: { id: true },
      orderBy: { expiresAt: 'asc' },
      take: limit,
    });
    if (rows.length === 0) return 0;
    const { count } = await this.prisma.verification.deleteMany({
      where: { id: { in: rows.map(({ id }) => id) } },
    });
    return count;
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
