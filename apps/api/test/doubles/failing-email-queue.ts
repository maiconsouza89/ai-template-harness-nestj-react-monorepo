import type { TestingModuleBuilder } from '@nestjs/testing';
import {
  type EmailJob,
  EmailQueue,
  type EmailQueuePort,
} from '../../src/modules/email/email-queue.js';

/** Erro que o dublê lança, como o produtor do BullMQ com o Valkey fora do ar. */
export class EmailQueueUnavailableError extends Error {
  override readonly name = 'EmailQueueUnavailableError';

  constructor() {
    super('Valkey fora do ar (dublê de teste)');
  }
}

/**
 * Dublê da fila `email.send` que sempre falha ao enfileirar (spec, Estratégia de testes): simula o
 * Valkey fora do ar no momento do cadastro sem parar o serviço do Compose, que os outros arquivos
 * de integração usam ao mesmo tempo. Guarda os jobs recusados para o teste conferir a tentativa.
 */
export class FailingEmailQueue implements EmailQueuePort {
  readonly attempts: EmailJob[] = [];

  async enqueue(job: EmailJob): Promise<void> {
    this.attempts.push(job);
    throw new EmailQueueUnavailableError();
  }
}

/** Liga o dublê no lugar do `EmailQueue` real, para `createTestApp({ override })`. */
export function withFailingEmailQueue(queue: FailingEmailQueue) {
  return (builder: TestingModuleBuilder) =>
    builder.overrideProvider(EmailQueue).useValue(queue);
}
