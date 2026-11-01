import { randomUUID } from 'node:crypto';
import { signJWT } from 'better-auth/crypto';
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
  user: { id: string; email: string };
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
  'create' | 'deleteOlderForUser' | 'deleteExpiredBefore' | 'deleteById'
>;

/** Registros vencidos há mais que isto saem na limpeza de cada envio (spec, Regras; hipótese). */
export const EXPIRED_LINK_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/** Quantos registros vencidos cada envio apaga no máximo (spec, Regras; hipótese). */
export const EXPIRED_LINK_CLEANUP_BATCH = 100;

/** Configuração do callback: origem da SPA, validade do link em segundos e segredo do JWT. */
export interface SendVerificationEmailOptions {
  webOrigin: string;
  expiresInSeconds: number;
  /** `BETTER_AUTH_SECRET`, o mesmo com que a biblioteca confere o token em `/verify-email`. */
  secret: string;
}

/**
 * Token do link: o mesmo JWT HS256 que o Better Auth 1.7.14 gera (`createEmailVerificationToken`
 * em `routes/email-verification`, com o e-mail em minúsculas e o prazo), acrescido de um `jti`
 * aleatório. O da biblioteca só depende do e-mail e do segundo da emissão: um reenvio no mesmo
 * segundo do cadastro repetiria o link anterior, que continuaria valendo. A biblioteca ignora o
 * `jti` ao conferir o token.
 */
export function issueEmailVerificationToken(
  email: string,
  secret: string,
  expiresInSeconds: number,
): Promise<string> {
  return signJWT(
    { email: email.toLowerCase(), jti: randomUUID() },
    secret,
    expiresInSeconds,
  );
}

/**
 * Vencimento gravado no registro de confirmação: o `exp` do próprio JWT. O `signJWT` arredonda a
 * emissão para baixo até o segundo inteiro; calcular o prazo à parte com `Date.now()` deixaria o
 * registro vencer até 1 s depois do token, e nessa janela o hook apagaria o registro de um link que
 * a biblioteca rejeita como `TOKEN_EXPIRED`, e reabri-lo diria `INVALID_TOKEN` (spec, Regras).
 */
export function emailVerificationTokenExpiresAt(token: string): Date {
  const payload: unknown = JSON.parse(
    Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'),
  );
  const exp = (payload as { exp?: unknown }).exp;
  if (typeof exp !== 'number') {
    throw new Error('token de confirmação sem exp');
  }
  return new Date(exp * 1000);
}

/**
 * Callback `emailVerification.sendVerificationEmail` do Better Auth (spec, Fluxo técnico do
 * reenvio), chamado no cadastro e no reenvio. Emite o token do link com
 * `issueEmailVerificationToken`, no lugar do que a biblioteca passa, para cada envio ter um link
 * próprio, e então:
 *
 * 1. grava o registro do hash do token novo, com vencimento igual ao `exp` dele, sem apagar os
 *    anteriores; se a gravação falha, nada mais acontece e os links já enviados seguem valendo;
 * 2. apaga até `EXPIRED_LINK_CLEANUP_BATCH` registros, de qualquer conta, vencidos há mais de
 *    `EXPIRED_LINK_RETENTION_MS`;
 * 3. pede o envio ao Módulo E-mail com o link da SPA, e não o `GET /api/auth/verify-email` que a
 *    biblioteca gera; o pedido leva só o tipo, o id da conta e o link;
 * 4. com o pedido na fila, apaga os registros da conta anteriores ao novo, e os links já enviados
 *    deixam de valer.
 *
 * Se a limpeza ou o pedido falham, apaga o registro novo, que nenhum e-mail leva, e os anteriores
 * continuam valendo. Toda falha sobe ao `runInBackgroundOrAwait` da biblioteca, que no cadastro a
 * registra sem desfazer a conta e no reenvio responde 500. A falha ao apagar os anteriores, com o
 * e-mail já na fila, também sobe, e o registro novo fica: o link que vai chegar continua valendo.
 */
export function createSendVerificationEmail(
  requester: EmailRequester,
  links: EmailVerificationLinkWriter,
  { webOrigin, expiresInSeconds, secret }: SendVerificationEmailOptions,
  now: () => Date = () => new Date(),
) {
  return async ({ user }: VerificationEmailData): Promise<void> => {
    const token = await issueEmailVerificationToken(
      user.email,
      secret,
      expiresInSeconds,
    );
    const created = await links.create(
      user.id,
      await hashEmailVerificationToken(token),
      emailVerificationTokenExpiresAt(token),
    );
    const request: EmailRequest = {
      type: 'verify-email',
      userId: user.id,
      url: confirmEmailUrl(webOrigin, token),
    };
    try {
      await links.deleteExpiredBefore(
        new Date(now().getTime() - EXPIRED_LINK_RETENTION_MS),
        EXPIRED_LINK_CLEANUP_BATCH,
      );
      await requester.execute(request);
    } catch (error) {
      await links.deleteById(created.id).catch(() => undefined);
      throw error;
    }
    await links.deleteOlderForUser(created);
  };
}

export type SendVerificationEmail = ReturnType<
  typeof createSendVerificationEmail
>;
