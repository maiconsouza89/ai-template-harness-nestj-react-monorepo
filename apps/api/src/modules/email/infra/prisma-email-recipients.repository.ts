import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../platform/prisma/prisma.service.js';
import {
  EmailRecipients,
  type EmailRecipient,
} from '../domain/email-recipients.js';

/** Lê nome e e-mail da conta pelo Prisma, no momento do envio. */
@Injectable()
export class PrismaEmailRecipientsRepository extends EmailRecipients {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findById(userId: string): Promise<EmailRecipient | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
  }
}
