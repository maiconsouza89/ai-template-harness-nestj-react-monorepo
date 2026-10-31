import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { RequestEmailUseCase } from './application/request-email/request-email.use-case.js';
import { SendEmailUseCase } from './application/send-email/send-email.use-case.js';
import { EmailQueue } from './domain/email-queue.js';
import { EmailRecipients } from './domain/email-recipients.js';
import { EmailTransport } from './domain/email-transport.js';
import { PrismaEmailRecipientsRepository } from './infra/prisma-email-recipients.repository.js';
import { BullMqEmailQueue } from './infra/queue/bullmq-email.queue.js';
import { EMAIL_SEND_QUEUE } from './infra/queue/email-send.queue.js';
import { EmailSendProcessor } from './infra/queue/email-send.processor.js';
import { NodemailerEmailTransport } from './infra/smtp/nodemailer-email.transport.js';

/** Fronteira pública do módulo (ADR-0025): outros módulos importam daqui, nunca das camadas. */
export { RequestEmailUseCase };
export type { EmailRequest, EmailType } from './domain/email-request.js';

/**
 * Módulo E-mail, raiz de composição (ADR-0025): registra a fila `email.send` (ADR-0015) sobre a
 * conexão do `QueueModule`, o worker no mesmo processo da API e liga cada porta à implementação
 * de `infra/` por `useClass`. Exporta só o pedido de envio, que enfileira; o envio de fato é do
 * worker.
 */
@Module({
  imports: [BullModule.registerQueue({ name: EMAIL_SEND_QUEUE })],
  providers: [
    RequestEmailUseCase,
    SendEmailUseCase,
    EmailSendProcessor,
    { provide: EmailQueue, useClass: BullMqEmailQueue },
    { provide: EmailRecipients, useClass: PrismaEmailRecipientsRepository },
    { provide: EmailTransport, useClass: NodemailerEmailTransport },
  ],
  exports: [RequestEmailUseCase],
})
export class EmailModule {}
