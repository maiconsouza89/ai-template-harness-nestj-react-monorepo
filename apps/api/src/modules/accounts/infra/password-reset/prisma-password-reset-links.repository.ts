import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../platform/prisma/prisma.service.js';
import {
  PASSWORD_RESET_IDENTIFIER_PREFIX,
  type PasswordResetLink,
  PasswordResetLinks,
} from '../../domain/password-reset-links.js';

/** Filtro dos registros de recuperação entre as linhas da tabela `verification`. */
const PASSWORD_RESET_RECORDS = {
  identifier: { startsWith: PASSWORD_RESET_IDENTIFIER_PREFIX },
};

/**
 * Registros de recuperação na tabela `verification` da fundação (spec, Modelo de dados), pelo
 * Prisma. Quem grava e consome é o Better Auth; aqui só se lê e apaga. Cada operação é um comando
 * só, sem transação nem trava: os anteriores de um registro são os da mesma conta com `createdAt`
 * menor, então dois pedidos simultâneos da mesma conta não apagam o registro um do outro.
 */
@Injectable()
export class PrismaPasswordResetLinksRepository extends PasswordResetLinks {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByIdentifier(
    identifier: string,
  ): Promise<PasswordResetLink | null> {
    if (!identifier.startsWith(PASSWORD_RESET_IDENTIFIER_PREFIX)) return null;
    const row = await this.prisma.verification.findFirst({
      where: { identifier },
      select: { id: true, value: true, expiresAt: true, createdAt: true },
    });
    return row
      ? {
          id: row.id,
          userId: row.value,
          expiresAt: row.expiresAt,
          createdAt: row.createdAt,
        }
      : null;
  }

  async deleteOlderForUser(
    link: Pick<PasswordResetLink, 'id' | 'userId' | 'createdAt'>,
  ): Promise<number> {
    const { count } = await this.prisma.verification.deleteMany({
      where: {
        ...PASSWORD_RESET_RECORDS,
        value: link.userId,
        createdAt: { lt: link.createdAt },
        id: { not: link.id },
      },
    });
    return count;
  }

  async deleteById(id: string): Promise<boolean> {
    const { count } = await this.prisma.verification.deleteMany({
      where: { ...PASSWORD_RESET_RECORDS, id },
    });
    return count > 0;
  }

  async deleteExpired(now: Date): Promise<number> {
    const { count } = await this.prisma.verification.deleteMany({
      where: { ...PASSWORD_RESET_RECORDS, expiresAt: { lt: now } },
    });
    return count;
  }
}
