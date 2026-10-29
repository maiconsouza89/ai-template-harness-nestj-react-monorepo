import { renderVerifyEmail, VERIFY_EMAIL_SUBJECT } from './verify-email.js';

const url =
  'http://localhost:3000/api/auth/verify-email?token=abc.def.ghi&callbackURL=http%3A%2F%2Flocalhost%3A5173%2Fconfirmar-email';

describe('renderVerifyEmail', () => {
  it('monta assunto e corpo em pt-BR com o nome, o link e as 24 horas', () => {
    const email = renderVerifyEmail({ name: 'Ana Souza', url });

    expect(email.subject).toBe(VERIFY_EMAIL_SUBJECT);
    expect(email.subject).toBe('Confirme seu e-mail');
    expect(email.text).toContain('Olá, Ana Souza!');
    expect(email.text).toContain(url);
    expect(email.text).toContain('O link vale por 24 horas.');
    expect(email.html).toContain('lang="pt-BR"');
    expect(email.html).toContain('Ana Souza');
    expect(email.html).toContain('vale por 24 horas');
  });

  it('escapa o nome e o link no HTML', () => {
    const email = renderVerifyEmail({
      name: '<script>alert(1)</script>',
      url,
    });

    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
    expect(email.html).toContain(url.replaceAll('&', '&amp;'));
  });
});
