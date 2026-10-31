import { Injectable } from '@nestjs/common';
import { EmailQueue } from '../../domain/email-queue.js';
import type { EmailRequest } from '../../domain/email-request.js';

/**
 * Pedido de envio de e-mail, a fronteira pública do Módulo E-mail (reexportada por
 * `email.module.ts`): só enfileira o pedido, que o worker entrega depois. Rejeita quando a fila
 * está fora; quem pede trata a falha sem desfazer o que já fez.
 */
@Injectable()
export class RequestEmailUseCase {
  constructor(private readonly queue: EmailQueue) {}

  execute(request: EmailRequest): Promise<void> {
    return this.queue.enqueue(request);
  }
}
