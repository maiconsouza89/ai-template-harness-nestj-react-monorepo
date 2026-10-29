import { runWithTransaction } from '@better-auth/core/context';
import type { EmailJob, EmailQueuePort } from '../../email/email-queue.js';
import { createSendVerificationEmail } from './send-verification-email.js';

/** Adaptador mínimo com transação real do ponto de vista do Better Auth: roda o trabalho e "commita". */
function fakeAdapter() {
  const adapter = {
    options: { adapterConfig: { transaction: true } },
    transaction: async <R>(work: (trx: unknown) => Promise<R>) => work(adapter),
  };
  return adapter as unknown as Parameters<typeof runWithTransaction>[0];
}

function queueDouble(enqueue: (job: EmailJob) => Promise<void>) {
  return { enqueue: vi.fn(enqueue) } satisfies EmailQueuePort;
}

const input = {
  user: { id: 'user-1' },
  url: 'http://localhost:3000/api/auth/verify-email?token=t&callbackURL=%2F',
};

describe('createSendVerificationEmail', () => {
  it('agenda o job verify-email com id e link só depois do commit da transação', async () => {
    const queue = queueDouble(async () => undefined);
    const logger = { error: vi.fn() };
    const send = createSendVerificationEmail(queue, logger);

    await runWithTransaction(fakeAdapter(), async () => {
      await send(input);
      expect(queue.enqueue).not.toHaveBeenCalled();
    });

    expect(queue.enqueue).toHaveBeenCalledTimes(1);
    expect(queue.enqueue).toHaveBeenCalledWith({
      kind: 'verify-email',
      userId: 'user-1',
      url: input.url,
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('não agenda nada quando a transação desfaz o trabalho', async () => {
    const queue = queueDouble(async () => undefined);
    const send = createSendVerificationEmail(queue, { error: vi.fn() });

    await expect(
      runWithTransaction(fakeAdapter(), async () => {
        await send(input);
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('registra o erro ao enfileirar sem lançar e sem dado pessoal nem link no log', async () => {
    const queue = queueDouble(async () => {
      throw new Error('Stream isn’t writeable: ana@example.com');
    });
    const logger = { error: vi.fn() };
    const send = createSendVerificationEmail(queue, logger);

    await expect(
      runWithTransaction(fakeAdapter(), async () => {
        await send(input);
        return 'conta criada';
      }),
    ).resolves.toBe('conta criada');

    expect(queue.enqueue).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(logger.error.mock.calls[0]);
    expect(logged).toContain('verify-email');
    expect(logged).not.toContain('ana@example.com');
    expect(logged).not.toContain('token=');
  });

  it('fora de transação enfileira na hora', async () => {
    const queue = queueDouble(async () => undefined);
    await createSendVerificationEmail(queue, { error: vi.fn() })(input);
    expect(queue.enqueue).toHaveBeenCalledTimes(1);
  });
});
