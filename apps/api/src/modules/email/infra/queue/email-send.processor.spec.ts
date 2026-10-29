import { Logger } from '@nestjs/common';
import { type Job, UnrecoverableError } from 'bullmq';
import type { EmailJob } from '../../email-queue.js';
import type { MailTransport, OutgoingMail } from '../smtp/mail-transport.js';
import {
  EmailDeliveryError,
  type EmailRecipientReader,
  EmailSendProcessor,
} from './email-send.processor.js';

const url =
  'http://localhost:3000/api/auth/verify-email?token=segredo.do.token&callbackURL=%2F';

function jobOf(data: EmailJob, attemptsStarted = 1): Job<EmailJob> {
  return {
    id: '42',
    data,
    attemptsStarted,
    attemptsMade: attemptsStarted - 1,
  } as Job<EmailJob>;
}

function setup(
  recipient: { name: string; email: string } | null,
  send: (mail: OutgoingMail) => Promise<void> = async () => undefined,
) {
  const findUnique = vi.fn(async () => recipient);
  const users = { user: { findUnique } } as EmailRecipientReader;
  const transport = { send: vi.fn(send) } satisfies MailTransport;
  const processor = new EmailSendProcessor(users, transport);
  return { processor, findUnique, transport };
}

/** Tudo o que o Logger do Nest recebeu nesta execução, serializado. */
function loggedText(spies: ReturnType<typeof vi.spyOn>[]) {
  return JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
}

describe('EmailSendProcessor', () => {
  let spies: ReturnType<typeof vi.spyOn>[];

  beforeEach(() => {
    spies = (['log', 'warn', 'error'] as const).map((level) =>
      vi.spyOn(Logger.prototype, level).mockImplementation(() => undefined),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const job = jobOf({ kind: 'verify-email', userId: 'user-1', url });

  it('lê o usuário, monta o e-mail de confirmação e envia para o endereço da conta', async () => {
    const { processor, findUnique, transport } = setup({
      name: 'Ana Souza',
      email: 'ana@example.com',
    });

    await processor.process(job);

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { name: true, email: true },
    });
    expect(transport.send).toHaveBeenCalledTimes(1);
    const [mail] = transport.send.mock.calls[0];
    expect(mail.to).toBe('ana@example.com');
    expect(mail.subject).toBe('Confirme seu e-mail');
    expect(mail.text).toContain(url);
    expect(mail.text).toContain('Ana Souza');
  });

  it('registra só id do job, tipo e tentativa, sem endereço, nome nem link', async () => {
    const { processor } = setup({
      name: 'Ana Souza',
      email: 'ana@example.com',
    });

    await processor.process(jobOf(job.data, 2));

    const text = loggedText(spies);
    expect(text).toContain('"jobId":"42"');
    expect(text).toContain('"kind":"verify-email"');
    expect(text).toContain('"attempt":2');
    expect(text).not.toContain('ana@example.com');
    expect(text).not.toContain('Ana Souza');
    expect(text).not.toContain('segredo.do.token');
  });

  it('usuário inexistente falha o job sem nova tentativa', async () => {
    const { processor, transport } = setup(null);

    await expect(processor.process(job)).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
    expect(transport.send).not.toHaveBeenCalled();
  });

  it('falha no SMTP é relançada sem a mensagem original, para o BullMQ tentar de novo', async () => {
    const { processor } = setup(
      { name: 'Ana Souza', email: 'ana@example.com' },
      async () => {
        throw Object.assign(
          new Error('Recipient rejected: <ana@example.com>'),
          { code: 'EENVELOPE' },
        );
      },
    );

    const error = await processor.process(job).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(EmailDeliveryError);
    expect(error).not.toBeInstanceOf(UnrecoverableError);
    expect((error as Error).message).not.toContain('ana@example.com');
    const text = loggedText(spies);
    expect(text).toContain('EENVELOPE');
    expect(text).not.toContain('ana@example.com');
    expect(text).not.toContain('segredo.do.token');
  });
});
