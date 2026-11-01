import {
  type AlreadyVerifiedBody,
  verifyEmailCodes,
  verifyEmailMessages,
} from '@app/contracts';
import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { verifyJWT } from 'better-auth/crypto';
import {
  type EmailVerificationLinks,
  hashEmailVerificationToken,
} from '../../domain/email-verification-links.js';

/** Caminho da confirmação de e-mail, relativo ao `basePath` do Better Auth. */
export const VERIFY_EMAIL_PATH = '/verify-email';

/** O que a checagem precisa saber da conta. */
export interface VerifyEmailAccount {
  emailVerified: boolean;
}

/** O que a checagem usa da porta dos registros de confirmação. */
export type EmailVerificationLinkReader = Pick<
  EmailVerificationLinks,
  'findByTokenHash' | 'deleteById'
>;

/** O que a checagem precisa da requisição: o token, os registros, as contas e o JWT. */
export interface VerifyEmailCheckInput {
  path: string | undefined;
  token: unknown;
  links: EmailVerificationLinkReader;
  findUserById: (id: string) => Promise<VerifyEmailAccount | null>;
  findUserByEmail: (email: string) => Promise<VerifyEmailAccount | null>;
  /** Payload do JWT com assinatura e prazo válidos, ou `null` (`verifyJWT` da biblioteca). */
  verifyToken: (token: string) => Promise<{ email?: unknown } | null>;
  now?: () => Date;
}

const alreadyVerified: AlreadyVerifiedBody = {
  status: true,
  code: verifyEmailCodes.alreadyVerified,
};

function invalidToken(): APIError {
  return new APIError('UNAUTHORIZED', {
    code: verifyEmailCodes.invalidToken,
    message: verifyEmailMessages.invalidToken,
  });
}

function tokenExpired(): APIError {
  return new APIError('UNAUTHORIZED', {
    code: verifyEmailCodes.tokenExpired,
    message: verifyEmailMessages.tokenExpired,
  });
}

/**
 * Regras da confirmação antes do Better Auth (spec, Regras e fluxos). Fora de `/verify-email`
 * não faz nada. O registro do hash do token na tabela `verification` decide uso único e prazo:
 *
 * - com registro de conta pendente dentro do prazo, apaga o registro e devolve `undefined`, para
 *   o pedido seguir à biblioteca, que confere o JWT e ativa a conta;
 * - com registro vencido, recusa com 401 `TOKEN_EXPIRED` e mantém o registro, para reabrir o
 *   link continuar dizendo que venceu;
 * - com registro de conta já ativa, apaga o registro e responde 200 `ALREADY_VERIFIED`;
 * - com registro de conta que não existe mais, recusa com 401 `INVALID_TOKEN`;
 * - quando outro pedido com o mesmo link apagou o registro antes (corrida), relê a conta:
 *   ativa responde `ALREADY_VERIFIED`, pendente recusa com `INVALID_TOKEN`;
 * - sem registro (link já usado, trocado por reenvio, adulterado ou de antes do RF-002), só
 *   responde `ALREADY_VERIFIED` quando o JWT tem assinatura e prazo válidos e a conta do e-mail
 *   dele já está ativa; senão recusa com 401 `INVALID_TOKEN`.
 *
 * Nenhuma resposta ecoa o token, e nada aqui escreve no log.
 */
export async function checkVerifyEmail(
  input: VerifyEmailCheckInput,
): Promise<AlreadyVerifiedBody | undefined> {
  if (input.path !== VERIFY_EMAIL_PATH) return undefined;
  const { token, links } = input;
  if (typeof token !== 'string' || token.length === 0) throw invalidToken();

  const link = await links.findByTokenHash(
    await hashEmailVerificationToken(token),
  );

  if (!link) {
    const payload = await input.verifyToken(token);
    if (typeof payload?.email !== 'string') throw invalidToken();
    const account = await input.findUserByEmail(payload.email);
    if (account?.emailVerified) return alreadyVerified;
    throw invalidToken();
  }

  const account = await input.findUserById(link.userId);
  if (!account) throw invalidToken();
  if (account.emailVerified) {
    await links.deleteById(link.id);
    return alreadyVerified;
  }
  const now = input.now?.() ?? new Date();
  if (link.expiresAt.getTime() <= now.getTime()) throw tokenExpired();

  if (await links.deleteById(link.id)) return undefined;
  // Outro pedido com o mesmo link consumiu o registro entre a busca e a remoção.
  const reread = await input.findUserById(link.userId);
  if (reread?.emailVerified) return alreadyVerified;
  throw invalidToken();
}

/**
 * Plugin do Módulo Contas com o hook `before` de `/verify-email` (ADR-0010; spec, Decisões): o
 * Better Auth 1.7.14 gera o token como JWT sem estado, e o hook acrescenta o uso único e a
 * invalidação no reenvio pelos registros de confirmação. O corpo devolvido pelo hook, sem
 * `context`, vira a resposta (`runBeforeHooks` em `api/dispatch`); as recusas sobem como
 * `APIError`. Entra em `plugins`, e não no hook global, que é o do cadastro.
 */
export const createVerifyEmailPlugin = (links: EmailVerificationLinkReader) =>
  ({
    id: 'verify-email',
    hooks: {
      before: [
        {
          matcher: (ctx) => ctx.path === VERIFY_EMAIL_PATH,
          handler: createAuthMiddleware(async (ctx) => {
            const adapter = ctx.context.internalAdapter;
            const body = await checkVerifyEmail({
              path: ctx.path,
              token: (ctx.query as { token?: unknown } | undefined)?.token,
              links,
              findUserById: (id) => adapter.findUserById(id),
              findUserByEmail: async (email) =>
                (await adapter.findUserByEmail(email))?.user ?? null,
              verifyToken: (token) => verifyJWT(token, ctx.context.secret),
            });
            return body ? ctx.json(body) : undefined;
          }),
        },
      ],
    },
  }) satisfies BetterAuthPlugin;
