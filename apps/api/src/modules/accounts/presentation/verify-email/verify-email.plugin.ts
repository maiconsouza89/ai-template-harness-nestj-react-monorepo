import {
  type AlreadyVerifiedBody,
  verifyEmailCodes,
  verifyEmailMessages,
} from '@app/contracts';
import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthMiddleware, isAPIError } from 'better-auth/api';
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
 * - com registro de conta pendente dentro do prazo, devolve `undefined` sem apagar o registro,
 *   para o pedido seguir à biblioteca, que confere o JWT e ativa a conta; o registro só sai no
 *   hook `after` (`consumeVerifyEmailLink`), quando a biblioteca responde sem erro;
 * - com registro vencido, recusa com 401 `TOKEN_EXPIRED` e mantém o registro, para reabrir o
 *   link continuar dizendo que venceu;
 * - com registro de conta já ativa, apaga o registro e responde 200 `ALREADY_VERIFIED`;
 * - com registro de conta que não existe mais, recusa com 401 `INVALID_TOKEN`;
 * - sem registro (link já usado, trocado por reenvio, adulterado ou de antes do RF-002), só
 *   responde `ALREADY_VERIFIED` quando o JWT tem assinatura e prazo válidos e a conta do e-mail
 *   dele já está ativa; senão recusa com 401 `INVALID_TOKEN`.
 *
 * Dois pedidos simultâneos com o mesmo link seguem os dois para a biblioteca enquanto o registro
 * existe; ela grava `emailVerified` de forma idempotente e responde 200 aos dois. Um pedido que
 * chega depois de o registro sair cai no caso sem registro, com a conta já ativa.
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
  return undefined;
}

/** O que o consumo do registro precisa da requisição já respondida pela biblioteca. */
export interface VerifyEmailConsumeInput {
  path: string | undefined;
  token: unknown;
  /** `ctx.context.returned` do hook `after`: o corpo da resposta ou o `APIError` da biblioteca. */
  returned: unknown;
  links: EmailVerificationLinkReader;
}

/**
 * Consumo do registro depois do Better Auth (spec, Regras e fluxos; Decisões, revisão do PR #16).
 * O `after` só roda quando o `before` deixou o pedido seguir, ou seja, com registro vigente de
 * conta pendente. No `dispatch` do Better Auth 1.7.14, `returned` é o corpo da resposta
 * (`{ status: true, user: null }`) quando a biblioteca ativa a conta, e o `APIError` quando ela
 * recusa (`USER_NOT_FOUND`, `INVALID_TOKEN`, `TOKEN_EXPIRED`, ou o redirecionamento de
 * `callbackURL`, que a SPA não usa); uma exceção que não é `APIError` (banco fora) sobe sem passar
 * pelo `after`. Só a resposta sem erro apaga o registro: nos outros casos ele fica, e o mesmo link
 * pode ser aberto de novo. Devolve se apagou.
 */
export async function consumeVerifyEmailLink(
  input: VerifyEmailConsumeInput,
): Promise<boolean> {
  if (input.path !== VERIFY_EMAIL_PATH) return false;
  const { token, returned, links } = input;
  if (typeof token !== 'string' || token.length === 0) return false;
  if (returned === undefined || returned instanceof Error) return false;
  if (isAPIError(returned)) return false;
  const link = await links.findByTokenHash(
    await hashEmailVerificationToken(token),
  );
  return link ? links.deleteById(link.id) : false;
}

function queryToken(query: unknown): unknown {
  return (query as { token?: unknown } | undefined)?.token;
}

/**
 * Plugin do Módulo Contas com os hooks `before` e `after` de `/verify-email` (ADR-0010; spec,
 * Decisões): o Better Auth 1.7.14 gera o token como JWT sem estado, e os hooks acrescentam o uso
 * único e a invalidação no reenvio pelos registros de confirmação. O corpo devolvido pelo `before`,
 * sem `context`, vira a resposta (`runBeforeHooks` em `api/dispatch`), e as recusas sobem como
 * `APIError`; o `after` não muda a resposta e registra no log, sem detalhe, a falha ao apagar. Entra em `plugins`, e não no hook global, que é o do
 * cadastro.
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
              token: queryToken(ctx.query),
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
      after: [
        {
          matcher: (ctx) => ctx.path === VERIFY_EMAIL_PATH,
          handler: createAuthMiddleware(async (ctx) => {
            // A conta já está ativa: uma falha ao apagar o registro não vira 500. O registro
            // fica, e reabrir o link responde `ALREADY_VERIFIED` e o apaga.
            await consumeVerifyEmailLink({
              path: ctx.path,
              token: queryToken(ctx.query),
              returned: ctx.context.returned,
              links,
            }).catch((error: unknown) => {
              ctx.context.logger.error(
                'falha ao apagar o registro de confirmação',
                error,
              );
            });
          }),
        },
      ],
    },
  }) satisfies BetterAuthPlugin;
