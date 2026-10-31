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
  /** Roda enquanto o servidor "não atende", como a conexão pendente com o SMTP fora do ar. */
  whileConnecting?: () => void;

  verify(): Promise<void> {
    this.whileConnecting?.();
    if (this.failWith) return Promise.reject(this.failWith);
    return Promise.resolve();
  }

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
    u1: {
      name: 'Paula Dias',
      email: 'paula@example.com',
      emailVerified: false,
    },
    confirmada: {
      name: 'Rui Lopes',
      email: 'rui@example.com',
      emailVerified: true,
    },
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

  it('descarta a confirmação de conta que já confirmou o e-mail, sem entregar', async () => {
    const transport = new TransportDouble();
    const result = await new SendEmailUseCase(recipients, transport).execute({
      ...request,
      userId: 'confirmada',
    });

    expect(result).toBe('already-verified');
    expect(transport.sent).toEqual([]);
  });

  it('descarta a confirmação quando a conta confirma enquanto o servidor de e-mail não atende', async () => {
    const accounts: Record<string, EmailRecipient> = {
      u1: {
        name: 'Ulisses Prado',
        email: 'ulisses@example.com',
        emailVerified: false,
      },
    };
    const transport = new TransportDouble();
    transport.whileConnecting = () => {
      accounts.u1 = { ...accounts.u1, emailVerified: true };
    };
    const result = await new SendEmailUseCase(
      new RecipientsDouble(accounts),
      transport,
    ).execute(request);

    expect(result).toBe('already-verified');
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
