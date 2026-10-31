import { Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { BullMqEmailQueue } from './bullmq-email.queue.js';
import { EMAIL_SEND_ENQUEUE_TIMEOUT_MS } from './email-send.queue.js';

/** Fila dublê cujo `add` só termina quando o teste manda. */
function slowQueue() {
  let finish!: (job: { id: string }) => void;
  let fail!: (error: Error) => void;
  const queue = {
    on: vi.fn(),
    add: vi.fn(
      () =>
        new Promise<{ id: string }>((resolve, reject) => {
          finish = resolve;
          fail = reject;
        }),
    ),
  };
  return {
    queue: queue as unknown as Queue,
    finish: (job: { id: string }) => finish(job),
    fail: (error: Error) => fail(error),
  };
}

describe('BullMqEmailQueue', () => {
  const request = {
    type: 'verify-email' as const,
    userId: 'u1',
    url: 'http://localhost:5173/confirmar-email?token=abc',
  };
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('rejeita no limite e registra o job que o add criou depois dele', async () => {
    const { queue, finish } = slowQueue();
    const enqueued = new BullMqEmailQueue(queue).enqueue(request);
    const rejected = expect(enqueued).rejects.toThrow(
      `não respondeu em ${EMAIL_SEND_ENQUEUE_TIMEOUT_MS} ms`,
    );
    await vi.advanceTimersByTimeAsync(EMAIL_SEND_ENQUEUE_TIMEOUT_MS);
    await rejected;
    expect(warn).not.toHaveBeenCalled();

    finish({ id: '42' });
    await vi.runAllTimersAsync();

    expect(warn).toHaveBeenCalledTimes(1);
    const [line] = warn.mock.calls[0] as [string];
    expect(line).toContain('job 42');
    expect(line).toContain('conta u1');
    expect(line).not.toContain(request.url);
  });

  it('registra a falha do add que terminou depois do limite, sem a mensagem do erro', async () => {
    const { queue, fail } = slowQueue();
    const enqueued = new BullMqEmailQueue(queue).enqueue(request);
    const rejected = expect(enqueued).rejects.toThrow('não respondeu');
    await vi.advanceTimersByTimeAsync(EMAIL_SEND_ENQUEUE_TIMEOUT_MS);
    await rejected;

    fail(Object.assign(new Error('detalhe sensível'), { code: 'ECONNRESET' }));
    await vi.runAllTimersAsync();

    expect(warn).toHaveBeenCalledTimes(1);
    const [line] = warn.mock.calls[0] as [string];
    expect(line).toContain('não entrou');
    expect(line).toContain('ECONNRESET');
    expect(line).not.toContain('detalhe sensível');
  });

  it('registra o erro da conexão da fila sem a mensagem do driver', () => {
    const { queue } = slowQueue();
    new BullMqEmailQueue(queue);
    const [event, listener] = vi.mocked(queue.on).mock.calls[0] as [
      string,
      (error: Error) => void,
    ];

    listener(
      Object.assign(new Error('connect ECONNREFUSED valkey:6379'), {
        code: 'ECONNREFUSED',
      }),
    );

    expect(event).toBe('error');
    const [line] = warn.mock.calls[0] as [string];
    expect(line).toContain('Error (ECONNREFUSED)');
    expect(line).not.toContain('valkey:6379');
  });

  it('não registra nada quando o add falha antes do limite', async () => {
    const { queue, fail } = slowQueue();
    const enqueued = new BullMqEmailQueue(queue).enqueue(request);
    const rejected = expect(enqueued).rejects.toThrow('Valkey fora');
    fail(new Error('Valkey fora'));
    await rejected;
    await vi.runAllTimersAsync();

    expect(warn).not.toHaveBeenCalled();
  });
});
