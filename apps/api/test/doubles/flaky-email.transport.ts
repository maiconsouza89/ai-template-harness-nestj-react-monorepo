import {
  EmailTransport,
  type EmailMessage,
} from '../../src/modules/email/domain/email-transport.js';

/**
 * Dublê do transporte de e-mail (DEP-1): falha nas primeiras `failures` entregas, como um SMTP
 * fora do ar, e depois repassa ao transporte real. Ligado por `overrideProvider(EmailTransport)`.
 */
export class FlakyEmailTransport extends EmailTransport {
  attempts = 0;

  constructor(
    private readonly real: EmailTransport,
    private readonly failures: number,
  ) {
    super();
  }

  async verify(): Promise<void> {
    await this.real.verify();
  }

  async send(message: EmailMessage): Promise<void> {
    this.attempts += 1;
    if (this.attempts <= this.failures) {
      throw Object.assign(new Error('SMTP indisponível (dublê)'), {
        code: 'ECONNECTION',
      });
    }
    await this.real.send(message);
  }
}
