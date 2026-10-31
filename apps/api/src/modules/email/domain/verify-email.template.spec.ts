import {
  renderVerifyEmail,
  VERIFY_EMAIL_SUBJECT,
  VERIFY_EMAIL_VALIDITY,
} from './verify-email.template.js';

describe('renderVerifyEmail', () => {
  const url = 'http://localhost:5173/confirmar-email?token=abc.def&x=1';

  it('tem o assunto em pt-BR', () => {
    expect(renderVerifyEmail({ name: 'Paula Dias', url }).subject).toBe(
      'Confirme seu e-mail',
    );
    expect(VERIFY_EMAIL_SUBJECT).toBe('Confirme seu e-mail');
  });

  it('cumprimenta pelo nome e traz o link e a validade no texto', () => {
    const { text } = renderVerifyEmail({ name: 'Paula Dias', url });
    expect(text).toContain('Olá, Paula Dias!');
    expect(text).toContain(url);
    expect(text).toContain('O link vale por 24 horas.');
  });

  it('cumprimenta pelo nome e traz o link e a validade no HTML em pt-BR', () => {
    const { html } = renderVerifyEmail({ name: 'Paula Dias', url });
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain('Olá, Paula Dias!');
    expect(html).toContain(
      'href="http://localhost:5173/confirmar-email?token=abc.def&amp;x=1"',
    );
    expect(html).toContain(VERIFY_EMAIL_VALIDITY);
  });

  it('escapa o nome no HTML', () => {
    const { html, text } = renderVerifyEmail({
      name: '<b>Zé</b> & "Cia"',
      url,
    });
    expect(html).toContain('&lt;b&gt;Zé&lt;/b&gt; &amp; &quot;Cia&quot;');
    expect(html).not.toContain('<b>Zé</b>');
    expect(text).toContain('<b>Zé</b> & "Cia"');
  });
});
