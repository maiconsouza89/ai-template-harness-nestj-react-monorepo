import type { EmailRequest } from './email-request.js';

/**
 * Porta da fila de e-mail: guarda o pedido para o worker enviar depois. Rejeita quando não
 * consegue enfileirar; quem pede decide o que fazer com a falha (o cadastro só registra).
 */
export abstract class EmailQueue {
  abstract enqueue(request: EmailRequest): Promise<void>;
}
