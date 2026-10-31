import { Logger } from '@nestjs/common';
import type { SendEmailUseCase } from '../../application/send-email/send-email.use-case.js';
import { EmailSendProcessor } from './email-send.processor.js';

describe('EmailSendProcessor', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registra o erro do worker sem a mensagem do driver', () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});
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
});
