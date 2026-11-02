import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type {
  SendEmailResult,
  SendEmailUseCase,
} from '../../application/send-email/send-email.use-case.js';
import type { EmailType } from '../../domain/email-request.js';
import { EmailSendProcessor } from './email-send.processor.js';

const URLS: Record<EmailType, string> = {
  'verify-email': 'http://localhost:5173/confirmar-email?token=segredo',
  'reset-password': 'http://localhost:5173/redefinir-senha?token=segredo',
};

/** Job dublê com as opções da fila; `updateData` regrava `data` como o BullMQ. */
function fakeJob(data: unknown, attemptsMade = 0) {
  const job = {
    id: '7',
    name: 'verify-email',
    data,
    attemptsMade,
    opts: { attempts: 5 },
    updateData: vi.fn(async (next: unknown) => {
      job.data = next;
    }),
  };
  return job;
}

function processorReturning(result: SendEmailResult | Error) {
  const execute = vi.fn(() =>
    result instanceof Error ? Promise.reject(result) : Promise.resolve(result),
  );
  return new EmailSendProcessor({ execute } as unknown as SendEmailUseCase);
}

/** Roda o job como o BullMQ: `process`, depois `completed` ou `failed` com a tentativa contada. */
async function run(
  processor: EmailSendProcessor,
  job: ReturnType<typeof fakeJob>,
) {
  try {
    const result = await processor.process(job as unknown as Job);
    job.attemptsMade += 1;
    await processor.onCompleted(job as unknown as Job);
    return result;
  } catch (error) {
    job.attemptsMade += 1;
    await processor.onFailed(job as unknown as Job, error as Error);
    return error;
  }
}

describe('EmailSendProcessor', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registra o erro do worker sem a mensagem do driver', () => {
    const processor = new EmailSendProcessor({} as SendEmailUseCase);

    processor.onError(
      Object.assign(new Error('connect ECONNREFUSED valkey:6379'), {
        code: 'ECONNREFUSED',
      }),
    );

    const [line] = warn.mock.calls[0] as [string];
    expect(line).toContain('Error (ECONNREFUSED)');
    expect(line).not.toContain('valkey:6379');
  });

  describe.each(['verify-email', 'reset-password'] as const)(
    'sigilo do link do job %s',
    (type) => {
      const request = { type, userId: 'u1', url: URLS[type] };

      it.each(['sent', 'discarded', 'already-verified'] as const)(
        'ao concluir com %s, regrava os dados só com o tipo e o id da conta',
        async (result) => {
          const job = fakeJob({ ...request });

          expect(await run(processorReturning(result), job)).toBe(result);

          expect(job.updateData).toHaveBeenCalledTimes(1);
          expect(job.data).toEqual({ type, userId: 'u1' });
        },
      );

      it('mantém o link quando a falha ainda terá nova tentativa', async () => {
        const job = fakeJob({ ...request }, 3);

        await run(processorReturning(new Error('SMTP fora')), job);

        expect(job.attemptsMade).toBe(4);
        expect(job.updateData).not.toHaveBeenCalled();
        expect(job.data).toEqual(request);
      });

      it('regrava os dados quando a última tentativa falha', async () => {
        const job = fakeJob({ ...request }, 4);

        await run(processorReturning(new Error('SMTP fora')), job);

        expect(job.attemptsMade).toBe(5);
        expect(job.data).toEqual({ type, userId: 'u1' });
      });
    },
  );

  it('regrava os dados do job recusado por formato inválido, na primeira tentativa', async () => {
    const job = fakeJob({
      type: 'verify-email',
      userId: 'u1',
      url: '',
      extra: 'http://localhost:5173/confirmar-email?token=segredo',
    });

    const error = await run(processorReturning('sent'), job);

    expect(error).toMatchObject({ name: 'UnrecoverableError' });
    expect(job.attemptsMade).toBe(1);
    expect(job.data).toEqual({ type: 'verify-email', userId: 'u1' });
  });

  it('o log de falha leva o id da conta também com os dados já sem o link', async () => {
    const job = fakeJob({ type: 'verify-email', userId: 'u1' }, 5);

    await processorReturning('sent').onFailed(
      job as unknown as Job,
      new Error('stalled'),
    );

    const [line] = warn.mock.calls[0] as [string];
    expect(line).toContain('Job 7 da conta u1 falhou na tentativa 5 de 5');
  });

  it('registra a falha ao regravar os dados sem o link nem a mensagem do driver', async () => {
    const job = fakeJob({
      type: 'verify-email',
      userId: 'u1',
      url: URLS['verify-email'],
    });
    job.updateData.mockRejectedValueOnce(
      Object.assign(new Error('connect ECONNREFUSED valkey:6379'), {
        code: 'ECONNREFUSED',
      }),
    );

    await run(processorReturning('sent'), job);

    expect(warn).toHaveBeenCalledTimes(1);
    const [line] = warn.mock.calls[0] as [string];
    expect(line).toContain('Job 7 da conta u1 ficou com o link nos dados');
    expect(line).toContain('Error (ECONNREFUSED)');
    expect(line).not.toContain('token=');
    expect(line).not.toContain('valkey:6379');
  });
});
