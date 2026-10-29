import {
  fieldErrorsFrom,
  SIGN_UP_ERROR_CODES,
  SIGN_UP_VALIDATION_MESSAGE,
  signUpSchema,
} from '@app/contracts';
import { BASE_ERROR_CODES } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';

/** Rota de cadastro do Better Auth, relativa ao `basePath` (`/api/auth`). */
export const SIGN_UP_PATH = '/sign-up/email';

/** O que o hook lê do contexto da requisição; o adaptador entra só pela busca por e-mail. */
export interface SignUpHookContext {
  path?: string;
  body?: unknown;
  context: {
    internalAdapter: {
      findUserByEmail(email: string): Promise<unknown>;
    };
  };
}

/** Corpo que o Better Auth recebe depois do hook: o original com nome e e-mail normalizados. */
export interface SignUpHookResult {
  context: { body: Record<string, unknown> };
}

/**
 * Regra de cadastro do RF-001 antes de o Better Auth gravar (spec, Contratos de interface):
 * valida o corpo com `signUpSchema` de Contratos e recusa com 400 `VALIDATION_ERROR` e uma
 * entrada por campo; procura o e-mail em minúsculas e recusa duplicado com 422
 * `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`, porque com `requireEmailVerification` a biblioteca
 * responderia 200 genérico. Válido, devolve o corpo com nome e e-mail normalizados. Outras rotas
 * passam sem mudança. As mensagens de erro vêm dos esquemas e nunca levam o valor recebido.
 */
export async function signUpBeforeHandler(
  ctx: SignUpHookContext,
): Promise<SignUpHookResult | undefined> {
  if (ctx.path !== SIGN_UP_PATH) return undefined;

  const parsed = signUpSchema.safeParse(ctx.body);
  if (!parsed.success) {
    throw new APIError('BAD_REQUEST', {
      code: SIGN_UP_ERROR_CODES.VALIDATION_ERROR,
      message: SIGN_UP_VALIDATION_MESSAGE,
      fields: fieldErrorsFrom(parsed.error),
    });
  }

  const { name, email } = parsed.data;
  if (await ctx.context.internalAdapter.findUserByEmail(email)) {
    throw APIError.from(
      'UNPROCESSABLE_ENTITY',
      BASE_ERROR_CODES.USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL,
    );
  }

  const body = ctx.body as Record<string, unknown>;
  return { context: { body: { ...body, name, email } } };
}

/** Hook `before` do Better Auth, passado ao `createAuth` pelo `AccountsModule`. */
export const signUpBeforeHook = createAuthMiddleware(async (ctx) =>
  signUpBeforeHandler(ctx),
);
