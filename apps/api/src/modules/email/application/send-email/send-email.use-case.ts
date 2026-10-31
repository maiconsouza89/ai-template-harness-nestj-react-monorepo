import { Injectable } from '@nestjs/common';
import {
  EmailRecipients,
  type EmailRecipient,
} from '../../domain/email-recipients.js';
import type { EmailRequest } from '../../domain/email-request.js';
import { EmailTransport } from '../../domain/email-transport.js';
import {
  renderVerifyEmail,
  type RenderedEmail,
} from '../../domain/verify-email.template.js';

/**
 * `sent` quando a mensagem foi entregue; `discarded` quando a conta do pedido não existe mais;
 * `already-verified` quando o pedido é de confirmação e a conta já confirmou o e-mail.
 */
export type SendEmailResult = 'sent' | 'discarded' | 'already-verified';

/**
 * Envio de um pedido da fila: lê nome e e-mail da conta no momento da entrega, renderiza o
 * template do tipo e entrega pelo transporte. Conta que não existe mais descarta o pedido sem
 * erro, para a fila não tentar de novo, e o mesmo vale para a confirmação de uma conta que já
 * confirmou (por um link reenviado enquanto este job esperava o backoff); falha do transporte
 * rejeita, e a fila tenta de novo. A conta é lida antes e de novo depois de o servidor de e-mail
 * atender (`verify`): com o servidor fora, a conexão fica pendente por até o limite do transporte,
 * e a conta pode confirmar o e-mail nesse meio-tempo.
 */
@Injectable()
export class SendEmailUseCase {
  constructor(
    private readonly recipients: EmailRecipients,
    private readonly transport: EmailTransport,
  ) {}

  async execute(request: EmailRequest): Promise<SendEmailResult> {
    const before = await this.check(request);
    if (typeof before === 'string') return before;

    await this.transport.verify();
    const recipient = await this.check(request);
    if (typeof recipient === 'string') return recipient;

    const content = render(request, recipient.name);
    await this.transport.send({ to: recipient.email, ...content });
    return 'sent';
  }

  /** O destinatário atual, ou o motivo de descartar o pedido. */
  private async check(
    request: EmailRequest,
  ): Promise<EmailRecipient | Exclude<SendEmailResult, 'sent'>> {
    const recipient = await this.recipients.findById(request.userId);
    if (!recipient) return 'discarded';
    if (request.type === 'verify-email' && recipient.emailVerified) {
      return 'already-verified';
    }
    return recipient;
  }
}

function render(request: EmailRequest, name: string): RenderedEmail {
  switch (request.type) {
    case 'verify-email':
      return renderVerifyEmail({ name, url: request.url });
  }
}
