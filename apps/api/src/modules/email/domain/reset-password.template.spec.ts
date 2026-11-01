import {
  RESET_PASSWORD_SUBJECT,
  RESET_PASSWORD_VALIDITY,
  renderResetPasswordEmail,
} from './reset-password.template.js';

describe('renderResetPasswordEmail', () => {
  const url = 'http://localhost:5173/redefinir-senha?token=Xk3abc&x=1';

  it('tem o assunto em pt-BR', () => {
    expect(renderResetPasswordEmail({ name: 'Zilda Rocha', url }).subject).toBe(
      'Redefina sua senha',
    );
    expect(RESET_PASSWORD_SUBJECT).toBe('Redefina sua senha');
  });

  it('cumprimenta pelo nome e traz o link, a validade e o aviso no texto', () => {
    const { text } = renderResetPasswordEmail({ name: 'Zilda Rocha', url });
    expect(text).toContain('Olá, Zilda Rocha!');
    expect(text).toContain(url);
    expect(text).toContain(
      'O link vale por 1 hora e só pode ser usado uma vez.',
    );
    expect(text).toContain(
      'Se você não pediu a troca, ignore esta mensagem: sua senha continua a mesma.',
    );
  });

  it('cumprimenta pelo nome e traz o link e a validade no HTML em pt-BR', () => {
    const { html } = renderResetPasswordEmail({ name: 'Zilda Rocha', url });
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain('Olá, Zilda Rocha!');
    expect(html).toContain(
      'href="http://localhost:5173/redefinir-senha?token=Xk3abc&amp;x=1"',
    );
    expect(html).toContain(RESET_PASSWORD_VALIDITY);
  });

  it('escapa o nome no HTML', () => {
    const { html, text } = renderResetPasswordEmail({
      name: '<b>Zé</b> & "Cia"',
      url,
    });
    expect(html).toContain('&lt;b&gt;Zé&lt;/b&gt; &amp; &quot;Cia&quot;');
    expect(html).not.toContain('<b>Zé</b>');
    expect(text).toContain('<b>Zé</b> & "Cia"');
  });
});
