import type {
  EmailRequest,
  RequestEmailUseCase,
} from '../../../email/email.module.js';

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

/**
 * Callback `emailVerification.sendVerificationEmail` do Better Auth (spec, Fluxo técnico): monta o
 * link da SPA, e não o `GET /api/auth/verify-email` que a biblioteca gera, e pede o envio ao
 * Módulo E-mail. O pedido leva só o tipo, o id da conta e o link; nome, e-mail e senha ficam de
 * fora. A falha ao enfileirar sobe ao `runInBackgroundOrAwait` da biblioteca, que a registra sem
 * desfazer a conta.
 */
export function createSendVerificationEmail(
  requester: EmailRequester,
  webOrigin: string,
) {
  return async ({ user, token }: VerificationEmailData): Promise<void> => {
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
