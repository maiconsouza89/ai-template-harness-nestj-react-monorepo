/** Dados que o modelo do e-mail de confirmação recebe. */
export interface VerifyEmailTemplateInput {
  name: string;
  url: string;
}

/** Assunto, texto e HTML de uma mensagem. */
export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export const VERIFY_EMAIL_SUBJECT = 'Confirme seu e-mail';

/** Escapa o que entra no HTML vindo da conta (o nome) ou da URL. */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * E-mail de confirmação do cadastro (RF-001), em português do Brasil: o nome da pessoa, o link de
 * confirmação e o aviso de que ele vale por 24 horas (spec, Contratos de interface).
 */
export function renderVerifyEmail({
  name,
  url,
}: VerifyEmailTemplateInput): RenderedEmail {
  const text = [
    `Olá, ${name}!`,
    '',
    'Recebemos o seu cadastro. Para ativar a conta, confirme o seu e-mail abrindo o link abaixo:',
    '',
    url,
    '',
    'O link vale por 24 horas. Se você não fez este cadastro, ignore esta mensagem.',
  ].join('\n');

  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(url);
  const html = `<!doctype html>
<html lang="pt-BR">
  <body>
    <p>Olá, ${safeName}!</p>
    <p>Recebemos o seu cadastro. Para ativar a conta, confirme o seu e-mail:</p>
    <p><a href="${safeUrl}">Confirmar e-mail</a></p>
    <p>Se o botão não abrir, copie este endereço no navegador:<br>${safeUrl}</p>
    <p>O link vale por 24 horas. Se você não fez este cadastro, ignore esta mensagem.</p>
  </body>
</html>
`;

  return { subject: VERIFY_EMAIL_SUBJECT, text, html };
}
