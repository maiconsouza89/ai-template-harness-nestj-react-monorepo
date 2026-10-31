import {
  redactQueueAttributes,
  redactQueueException,
} from './queue-telemetry.js';

describe('redação da telemetria das filas', () => {
  it('mantém nome da fila, operação, nome e id do job e descarta motivo, resultado e opções', () => {
    expect(
      redactQueueAttributes({
        'bullmq.queue.name': 'email.send',
        'bullmq.queue.operation': 'process',
        'bullmq.job.name': 'verify-email',
        'bullmq.job.id': '1',
        'bullmq.job.attempts.made': 2,
        'bullmq.job.failed.reason': 'SMTP recusou ana@example.com',
        'bullmq.job.result': '"sent"',
        'bullmq.job.progress': '{"to":"ana@example.com"}',
        'bullmq.job.options': '{"jobId":"x"}',
        'bullmq.queue.options':
          '{"connection":{"url":"redis://:senha@valkey"}}',
        'bullmq.job.deduplication.key': 'ana@example.com',
        'chave.desconhecida': 'valor',
      }),
    ).toEqual({
      'bullmq.queue.name': 'email.send',
      'bullmq.queue.operation': 'process',
      'bullmq.job.name': 'verify-email',
      'bullmq.job.id': '1',
      'bullmq.job.attempts.made': 2,
    });
  });

  it('reduz a exceção a nome e código, sem mensagem nem stack', () => {
    const error = Object.assign(new Error('SMTP recusou ana@example.com'), {
      code: 'EENVELOPE',
    });
    expect(redactQueueException(error)).toEqual({
      name: 'Error',
      code: 'EENVELOPE',
    });
    expect(redactQueueException(new TypeError('token=abc'))).toEqual({
      name: 'TypeError',
    });
    expect(redactQueueException('SMTP recusou ana@example.com')).toEqual({
      name: 'Error',
    });
  });
});
