import {
  EmailRecipients,
  type EmailRecipient,
} from '../../domain/email-recipients.js';
import type { EmailRequest } from '../../domain/email-request.js';
import {
  EmailTransport,
  type EmailMessage,
} from '../../domain/email-transport.js';
import { SendEmailUseCase } from './send-email.use-case.js';

class RecipientsDouble extends EmailRecipients {
  constructor(private readonly accounts: Record<string, EmailRecipient>) {
    super();
  }

  findById(userId: string): Promise<EmailRecipient | null> {
    return Promise.resolve(this.accounts[userId] ?? null);
  }
}

class TransportDouble extends EmailTransport {
  readonly sent: EmailMessage[] = [];
  failWith?: Error;

  send(message: EmailMessage): Promise<void> {
    if (this.failWith) return Promise.reject(this.failWith);
    this.sent.push(message);
    return Promise.resolve();
  }
}

describe('SendEmailUseCase', () => {
  const url = 'http://localhost:5173/confirmar-email?token=abc';
  const request: EmailRequest = { type: 'verify-email', userId: 'u1', url };
  const recipients = new RecipientsDouble({
    u1: { name: 'Paula Dias', email: 'paula@example.com' },
  });

  it('lê o destinatário da conta e entrega o e-mail de confirmação', async () => {
    const transport = new TransportDouble();
    const result = await new SendEmailUseCase(recipients, transport).execute(
      request,
    );

    expect(result).toBe('sent');
    expect(transport.sent).toHaveLength(1);
    const [message] = transport.sent;
    expect(message.to).toBe('paula@example.com');
    expect(message.subject).toBe('Confirme seu e-mail');
    expect(message.text).toContain('Paula Dias');
    expect(message.text).toContain(url);
    expect(message.html).toContain('O link vale por 24 horas.');
  });

  it('descarta o pedido de conta que não existe mais, sem entregar', async () => {
    const transport = new TransportDouble();
    const result = await new SendEmailUseCase(recipients, transport).execute({
      ...request,
      userId: 'apagada',
    });

    expect(result).toBe('discarded');
    expect(transport.sent).toEqual([]);
  });

  it('rejeita quando o transporte falha, para a fila tentar de novo', async () => {
    const transport = new TransportDouble();
    transport.failWith = new Error('SMTP fora');
    await expect(
      new SendEmailUseCase(recipients, transport).execute(request),
    ).rejects.toThrow('SMTP fora');
  });
});
