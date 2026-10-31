import { EmailQueue } from '../../domain/email-queue.js';
import type { EmailRequest } from '../../domain/email-request.js';
import { RequestEmailUseCase } from './request-email.use-case.js';

class QueueDouble extends EmailQueue {
  readonly requests: EmailRequest[] = [];
  failWith?: Error;

  enqueue(request: EmailRequest): Promise<void> {
    if (this.failWith) return Promise.reject(this.failWith);
    this.requests.push(request);
    return Promise.resolve();
  }
}

describe('RequestEmailUseCase', () => {
  const request: EmailRequest = {
    type: 'verify-email',
    userId: 'Yp3m2',
    url: 'http://localhost:5173/confirmar-email?token=abc',
  };

  it('enfileira o pedido como recebido', async () => {
    const queue = new QueueDouble();
    await new RequestEmailUseCase(queue).execute(request);
    expect(queue.requests).toEqual([request]);
  });

  it('repassa a falha da fila a quem pediu', async () => {
    const queue = new QueueDouble();
    queue.failWith = new Error('fila fora');
    await expect(
      new RequestEmailUseCase(queue).execute(request),
    ).rejects.toThrow('fila fora');
  });
});
