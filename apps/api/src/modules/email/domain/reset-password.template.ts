import { escapeHtml, type RenderedEmail } from './verify-email.template.js';

export interface ResetPasswordTemplateInput {
  name: string;
  url: string;
}

export const RESET_PASSWORD_SUBJECT = 'Redefina sua senha';
export const RESET_PASSWORD_VALIDITY =
  'O link vale por 1 hora e só pode ser usado uma vez.';
export const RESET_PASSWORD_IGNORE =
  'Se você não pediu a troca, ignore esta mensagem: sua senha continua a mesma.';

/**
 * E-mail de recuperação de senha em pt-BR (spec do RF-005, Contratos de interface): assunto
 * "Redefina sua senha", saudação pelo nome, o link da SPA, a validade de 1 hora com o uso único e
 * o aviso para quem não pediu a troca, em texto e em HTML, com o nome escapado no HTML.
 */
export function renderResetPasswordEmail({
  name,
  url,
}: ResetPasswordTemplateInput): RenderedEmail {
  const text = [
    `Olá, ${name}!`,
    '',
    'Recebemos um pedido para trocar a senha da sua conta. Para definir uma nova senha, abra o link abaixo:',
    '',
    url,
    '',
    RESET_PASSWORD_VALIDITY,
    '',
    RESET_PASSWORD_IGNORE,
  ].join('\n');

  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(url);
  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <title>${RESET_PASSWORD_SUBJECT}</title>
  </head>
  <body style="font-family: Helvetica, Arial, sans-serif; color: #000000;">
    <p>Olá, ${safeName}!</p>
    <p>Recebemos um pedido para trocar a senha da sua conta. Para definir uma nova senha:</p>
    <p><a href="${safeUrl}">Redefinir a senha</a></p>
    <p>Se o botão não abrir, copie este endereço no navegador:<br>${safeUrl}</p>
    <p>${RESET_PASSWORD_VALIDITY}</p>
    <p>${RESET_PASSWORD_IGNORE}</p>
  </body>
</html>
`;

  return { subject: RESET_PASSWORD_SUBJECT, text, html };
}
