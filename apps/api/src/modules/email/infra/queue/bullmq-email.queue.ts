import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { withTimeout } from '../../../../platform/async/with-timeout.js';
import { EmailQueue } from '../../domain/email-queue.js';
import type { EmailRequest } from '../../domain/email-request.js';
import {
  EMAIL_SEND_ENQUEUE_TIMEOUT_MS,
  EMAIL_SEND_JOB_OPTIONS,
  EMAIL_SEND_QUEUE,
} from './email-send.queue.js';

/**
 * Produtor de `email.send` (ADR-0015): um job com o nome do tipo e o pedido como dados (tipo, id
 * da conta e link, sem endereço, nome nem senha), com tentativas, backoff e retenção. Falha rápido
 * com o Valkey fora: pela conexão sem fila offline ou pelo limite de tempo.
 */
@Injectable()
export class BullMqEmailQueue extends EmailQueue {
  private readonly logger = new Logger(BullMqEmailQueue.name);

  constructor(@InjectQueue(EMAIL_SEND_QUEUE) private readonly queue: Queue) {
    super();
    // Sem ouvinte, cada tentativa de reconexão vira um erro impresso no console.
    queue.on('error', (error: Error) =>
      this.logger.warn(
        `Fila ${EMAIL_SEND_QUEUE} indisponível: ${error.message}`,
      ),
    );
  }

  async enqueue(request: EmailRequest): Promise<void> {
    // Copia campo a campo: o tipo estrutural deixaria passar um campo extra, com dado pessoal,
    // para os dados do job.
    const data: EmailRequest = {
      type: request.type,
      userId: request.userId,
      url: request.url,
    };
    await withTimeout(
      this.queue.add(request.type, data, EMAIL_SEND_JOB_OPTIONS),
      EMAIL_SEND_ENQUEUE_TIMEOUT_MS,
      `Fila ${EMAIL_SEND_QUEUE} não respondeu em ${EMAIL_SEND_ENQUEUE_TIMEOUT_MS} ms`,
    );
  }
}
