import { queueAfterTransactionHook } from '@better-auth/core/context';
import type { LoggerService } from '@nestjs/common';
import type { EmailQueuePort } from '../../email/email-queue.js';

/** O que o Better Auth passa ao `sendVerificationEmail`; o token já vai dentro de `url`. */
export interface SendVerificationEmailInput {
  user: { id: string };
  url: string;
}

/** Nome do erro, sem a mensagem, que pode trazer detalhe da conexão ou do job. */
function errorName(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

/**
 * Callback `emailVerification.sendVerificationEmail` do Better Auth (RF-001): agenda o job
 * `verify-email` na fila `email.send` para depois do commit da conta, com
 * `queueAfterTransactionHook` (spec, Decisões). O Better Auth chama o callback dentro da
 * transação do cadastro, e um erro ali desfaria a conta; depois do commit, um erro ao enfileirar
 * (Valkey fora do ar) só é registrado no log, sem dado pessoal, e a resposta continua 200. O job
 * leva o id do usuário e o link, nunca a senha.
 */
export function createSendVerificationEmail(
  emailQueue: EmailQueuePort,
  logger: Pick<LoggerService, 'error'>,
) {
  return async ({ user, url }: SendVerificationEmailInput): Promise<void> => {
    await queueAfterTransactionHook(
      () => emailQueue.enqueue({ kind: 'verify-email', userId: user.id, url }),
      {
        onError: (error: unknown) => {
          logger.error(
            { kind: 'verify-email', err: errorName(error) },
            'Falha ao enfileirar o e-mail de confirmação; a conta foi criada e o reenvio fica com a pessoa',
          );
        },
      },
    );
  };
}
