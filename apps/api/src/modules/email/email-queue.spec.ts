import type { Queue } from 'bullmq';
import {
  EMAIL_JOB_OPTIONS,
  EmailQueue,
  ENQUEUE_TIMEOUT_MS,
  EnqueueTimeoutError,
  type EmailJob,
} from './email-queue.js';

function queueDouble(add: Queue<EmailJob>['add']) {
  return { add: vi.fn(add), on: vi.fn() } as unknown as Queue<EmailJob> & {
    add: ReturnType<typeof vi.fn>;
  };
}

const job: EmailJob = {
  kind: 'verify-email',
  userId: 'user-1',
  url: 'http://localhost:3000/api/auth/verify-email?token=t',
};

describe('EmailQueue', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('enfileira pelo tipo, com tentativas, backoff e retenção da spec', async () => {
    const queue = queueDouble(async () => ({}) as never);
    await new EmailQueue(queue).enqueue(job);

    expect(queue.add).toHaveBeenCalledWith('verify-email', job, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 604800 },
    });
    expect(EMAIL_JOB_OPTIONS.attempts).toBe(5);
  });

  it('propaga o erro do Valkey para quem chama', async () => {
    const queue = queueDouble(async () => {
      throw new Error('Stream isn’t writeable');
    });
    await expect(new EmailQueue(queue).enqueue(job)).rejects.toThrow(
      'writeable',
    );
  });

  it('desiste com EnqueueTimeoutError quando o Valkey não responde no prazo', async () => {
    vi.useFakeTimers();
    const queue = queueDouble(() => new Promise(() => undefined));
    const pending = new EmailQueue(queue).enqueue(job);
    const assertion =
      expect(pending).rejects.toBeInstanceOf(EnqueueTimeoutError);
    await vi.advanceTimersByTimeAsync(ENQUEUE_TIMEOUT_MS);
    await assertion;
  });
});
