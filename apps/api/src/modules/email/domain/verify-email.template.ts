/** Conteúdo renderizado de um e-mail, sem destinatário nem remetente. */
export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export interface VerifyEmailTemplateInput {
  name: string;
  url: string;
}

export const VERIFY_EMAIL_SUBJECT = 'Confirme seu e-mail';
export const VERIFY_EMAIL_VALIDITY = 'O link vale por 24 horas.';

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapa texto para o HTML do e-mail: o nome vem da pessoa e não pode virar marcação. */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

/**
 * E-mail de confirmação de cadastro em pt-BR (spec do RF-001, Contratos de interface): assunto
 * "Confirme seu e-mail", saudação pelo nome, o link e a validade de 24 horas, em texto e em HTML.
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
    VERIFY_EMAIL_VALIDITY,
    '',
    'Se você não criou esta conta, ignore esta mensagem.',
  ].join('\n');

  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(url);
  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <title>${VERIFY_EMAIL_SUBJECT}</title>
  </head>
  <body style="font-family: Helvetica, Arial, sans-serif; color: #000000;">
    <p>Olá, ${safeName}!</p>
    <p>Recebemos o seu cadastro. Para ativar a conta, confirme o seu e-mail:</p>
    <p><a href="${safeUrl}">Confirmar e-mail</a></p>
    <p>Se o botão não abrir, copie este endereço no navegador:<br>${safeUrl}</p>
    <p>${VERIFY_EMAIL_VALIDITY}</p>
    <p>Se você não criou esta conta, ignore esta mensagem.</p>
  </body>
</html>
`;

  return { subject: VERIFY_EMAIL_SUBJECT, text, html };
}
