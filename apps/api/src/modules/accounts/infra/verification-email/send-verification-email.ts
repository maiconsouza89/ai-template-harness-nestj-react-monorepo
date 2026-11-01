import type {
  EmailRequest,
  RequestEmailUseCase,
} from '../../../email/email.module.js';
import {
  type EmailVerificationLinks,
  hashEmailVerificationToken,
} from '../../domain/email-verification-links.js';

/** Rota da SPA que abre o link de confirmação (RF-002 constrói a tela). */
export const CONFIRM_EMAIL_PATH = '/confirmar-email';

/** O que o callback usa do Módulo E-mail: o pedido de envio exportado por `email.module.ts`. */
export type EmailRequester = Pick<RequestEmailUseCase, 'execute'>;

/** Dados que o Better Auth passa ao `emailVerification.sendVerificationEmail`. */
export interface VerificationEmailData {
  user: { id: string };
  token: string;
}

/** Link `<WEB_ORIGIN>/confirmar-email?token=<token>` que vai no e-mail. */
export function confirmEmailUrl(webOrigin: string, token: string): string {
  const url = new URL(CONFIRM_EMAIL_PATH, webOrigin);
  url.searchParams.set('token', token);
  return url.toString();
}

/** O que o callback usa da porta dos registros de confirmação. */
export type EmailVerificationLinkWriter = Pick<
  EmailVerificationLinks,
  'replaceForUser'
>;

/** Configuração do callback: origem da SPA e validade do link, em segundos. */
export interface SendVerificationEmailOptions {
  webOrigin: string;
  expiresInSeconds: number;
}

/**
 * Callback `emailVerification.sendVerificationEmail` do Better Auth (spec, Fluxo técnico), chamado
 * no cadastro e no reenvio. Primeiro troca o registro de confirmação da conta: apaga os
 * anteriores, para os links já enviados deixarem de valer, e grava o hash do token novo com
 * vencimento em `expiresInSeconds` a partir de agora (RF-002). Depois monta o link da SPA, e não o
 * `GET /api/auth/verify-email` que a biblioteca gera, e pede o envio ao Módulo E-mail. O pedido
 * leva só o tipo, o id da conta e o link; nome, e-mail e senha ficam de fora. A falha ao gravar o
 * registro impede o envio, e ela ou a falha ao enfileirar sobem ao `runInBackgroundOrAwait` da
 * biblioteca, que no cadastro a registra sem desfazer a conta e no reenvio responde 500.
 */
export function createSendVerificationEmail(
  requester: EmailRequester,
  links: EmailVerificationLinkWriter,
  { webOrigin, expiresInSeconds }: SendVerificationEmailOptions,
) {
  return async ({ user, token }: VerificationEmailData): Promise<void> => {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    await links.replaceForUser(
      user.id,
      await hashEmailVerificationToken(token),
      expiresAt,
    );
    const request: EmailRequest = {
      type: 'verify-email',
      userId: user.id,
      url: confirmEmailUrl(webOrigin, token),
    };
    await requester.execute(request);
  };
}

export type SendVerificationEmail = ReturnType<
  typeof createSendVerificationEmail
>;
