import type {
  EmailRequest,
  RequestEmailUseCase,
} from '../../../email/email.module.js';
import { describeError } from '../../../../platform/logging/describe-error.js';
import {
  type PasswordResetLinks,
  passwordResetIdentifier,
} from '../../domain/password-reset-links.js';

/** Rota da SPA que abre o link de recuperação (RF-005, fase da tela de nova senha). */
export const RESET_PASSWORD_PATH = '/redefinir-senha';

/** O que o callback usa do Módulo E-mail: o pedido de envio exportado por `email.module.ts`. */
export type EmailRequester = Pick<RequestEmailUseCase, 'execute'>;

/** O que o callback usa da porta dos registros de recuperação. */
export type PasswordResetLinkCleaner = Pick<
  PasswordResetLinks,
  'findByIdentifier' | 'deleteOlderForUser' | 'deleteById' | 'deleteExpired'
>;

/** Dados que o Better Auth passa ao `emailAndPassword.sendResetPassword`. */
export interface ResetPasswordEmailData {
  user: { id: string };
  /** Token em texto puro do link; o registro gravado guarda só o hash dele. */
  token: string;
  /** Link `GET /api/auth/reset-password/:token` da biblioteca, que a SPA não usa. */
  url?: string;
}

/** Configuração do callback: a origem da SPA, `WEB_ORIGIN`. */
export interface SendResetPasswordOptions {
  webOrigin: string;
}

/** Função que recebe a linha de falha; o Módulo Contas a liga ao logger do Nest. */
export type ResetPasswordFailureLog = (message: string) => void;

/** Link `<WEB_ORIGIN>/redefinir-senha?token=<token>` que vai no e-mail. */
export function resetPasswordUrl(webOrigin: string, token: string): string {
  const url = new URL(RESET_PASSWORD_PATH, webOrigin);
  url.searchParams.set('token', token);
  return url.toString();
}

/**
 * Callback `emailAndPassword.sendResetPassword` do Better Auth (spec, Fluxo técnico do pedido),
 * chamado no pedido de recuperação de conta existente, depois de a biblioteca gravar o registro do
 * hash do token:
 *
 * 1. acha o registro novo pelo identificador gravado, o hash de `reset-password:<token>`;
 * 2. apaga os registros de recuperação vencidos, de qualquer conta;
 * 3. pede o envio ao Módulo E-mail com o tipo `reset-password` e o link da SPA, e não o
 *    `GET /api/auth/reset-password/:token` que a biblioteca gera; o pedido leva só o tipo, o id
 *    da conta e o link;
 * 4. com o pedido na fila, apaga os registros da conta anteriores ao novo, e os links já
 *    enviados deixam de valer.
 *
 * Nenhuma falha sobe: um erro aqui viraria 500 só para e-mail com conta e revelaria a conta
 * (spec, Decisões). Se a limpeza ou o pedido falham, apaga o registro novo, que nenhum e-mail
 * leva, e os anteriores continuam valendo; se a remoção dos anteriores falha com o e-mail já na
 * fila, o registro novo fica. Cada falha vai para o log só com o nome e o código do erro, sem
 * e-mail, nome nem token (ADR-0018).
 */
export function createSendResetPassword(
  requester: EmailRequester,
  links: PasswordResetLinkCleaner,
  { webOrigin }: SendResetPasswordOptions,
  logFailure: ResetPasswordFailureLog,
  now: () => Date = () => new Date(),
) {
  return async ({ user, token }: ResetPasswordEmailData): Promise<void> => {
    let created;
    try {
      created = await links.findByIdentifier(
        await passwordResetIdentifier(token),
      );
    } catch (error) {
      logFailure(
        `Recuperação de senha: falha ao ler o registro novo: ${describeError(error)}`,
      );
      return;
    }
    if (!created) {
      logFailure(
        'Recuperação de senha: registro novo não encontrado; o e-mail não foi pedido',
      );
      return;
    }

    const request: EmailRequest = {
      type: 'reset-password',
      userId: user.id,
      url: resetPasswordUrl(webOrigin, token),
    };
    try {
      await links.deleteExpired(now());
      await requester.execute(request);
    } catch (error) {
      await links.deleteById(created.id).catch(() => undefined);
      logFailure(
        `Recuperação de senha: falha ao pedir o e-mail; o registro novo foi desfeito: ${describeError(error)}`,
      );
      return;
    }

    try {
      await links.deleteOlderForUser(created);
    } catch (error) {
      logFailure(
        `Recuperação de senha: falha ao apagar os links anteriores: ${describeError(error)}`,
      );
    }
  };
}

export type SendResetPassword = ReturnType<typeof createSendResetPassword>;
