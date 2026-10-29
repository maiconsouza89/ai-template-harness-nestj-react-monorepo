import { smtpTransportOptions, type SmtpEnv } from './mail-transport.js';

const base: SmtpEnv = {
  NODE_ENV: 'development',
  SMTP_HOST: 'localhost',
  SMTP_PORT: 1025,
  SMTP_FROM: 'App <no-reply@example.test>',
  SMTP_USER: undefined,
  SMTP_PASSWORD: undefined,
};

describe('smtpTransportOptions', () => {
  it('exige STARTTLS na porta 587 quando há credencial SMTP', () => {
    const options = smtpTransportOptions({
      ...base,
      SMTP_PORT: 587,
      SMTP_USER: 'usuario',
      SMTP_PASSWORD: 'x',
    });

    expect(options.secure).toBe(false);
    expect(options.requireTLS).toBe(true);
    expect(options.auth).toEqual({ user: 'usuario', pass: 'x' });
    expect(options.tls).toBeUndefined();
  });

  it('exige STARTTLS em produção mesmo sem credencial', () => {
    const options = smtpTransportOptions({
      ...base,
      NODE_ENV: 'production',
      SMTP_PORT: 587,
    });

    expect(options.requireTLS).toBe(true);
    expect(options.auth).toBeUndefined();
  });

  it('usa TLS implícito na porta 465', () => {
    const options = smtpTransportOptions({
      ...base,
      SMTP_PORT: 465,
      SMTP_USER: 'usuario',
      SMTP_PASSWORD: 'x',
    });

    expect(options.secure).toBe(true);
  });

  it.each(['development', 'test'] as const)(
    'deixa o Mailpit local sem credencial sem TLS (%s)',
    (NODE_ENV) => {
      const options = smtpTransportOptions({ ...base, NODE_ENV });

      expect(options.secure).toBe(false);
      expect(options.requireTLS).toBe(false);
      expect(options.auth).toBeUndefined();
    },
  );
});
