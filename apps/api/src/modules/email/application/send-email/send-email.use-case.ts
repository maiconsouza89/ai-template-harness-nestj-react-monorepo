import { Injectable } from '@nestjs/common';
import { EmailRecipients } from '../../domain/email-recipients.js';
import type { EmailRequest } from '../../domain/email-request.js';
import { EmailTransport } from '../../domain/email-transport.js';
import {
  renderVerifyEmail,
  type RenderedEmail,
} from '../../domain/verify-email.template.js';

/** `sent` quando a mensagem foi entregue; `discarded` quando a conta do pedido não existe mais. */
export type SendEmailResult = 'sent' | 'discarded';

/**
 * Envio de um pedido da fila: lê nome e e-mail da conta no momento da entrega, renderiza o
 * template do tipo e entrega pelo transporte. Conta que não existe mais descarta o pedido sem
 * erro, para a fila não tentar de novo; falha do transporte rejeita, e a fila tenta de novo.
 */
@Injectable()
export class SendEmailUseCase {
  constructor(
    private readonly recipients: EmailRecipients,
    private readonly transport: EmailTransport,
  ) {}

  async execute(request: EmailRequest): Promise<SendEmailResult> {
    const recipient = await this.recipients.findById(request.userId);
    if (!recipient) return 'discarded';

    const content = render(request, recipient.name);
    await this.transport.send({ to: recipient.email, ...content });
    return 'sent';
  }
}

function render(request: EmailRequest, name: string): RenderedEmail {
  switch (request.type) {
    case 'verify-email':
      return renderVerifyEmail({ name, url: request.url });
  }
}
