import {
  type SignUp,
  signUpErrorCodes,
  signUpErrorMessages,
  signUpSchema,
  toSignUpFieldErrors,
} from '@app/contracts';
import { APIError, createAuthMiddleware } from 'better-auth/api';

/** Caminho do cadastro por e-mail e senha, relativo ao `basePath` do Better Auth. */
export const SIGN_UP_PATH = '/sign-up/email';

/** O que a checagem precisa da requisição: o caminho, o corpo e a busca de conta por e-mail. */
export interface SignUpCheckInput {
  path: string | undefined;
  body: unknown;
  findUserByEmail: (email: string) => Promise<unknown>;
}

/**
 * Regra do cadastro antes do Better Auth (spec, Contratos de interface): fora de `/sign-up/email`
 * não faz nada; corpo fora do `signUpSchema` de Contratos recusa com 400 `VALIDATION_ERROR` e a
 * lista `fields`; e-mail já cadastrado, procurado em minúsculas, recusa com 422
 * `USER_ALREADY_EXISTS`. Válido, devolve só nome, e-mail e senha, com o nome sem os espaços das
 * pontas e o e-mail normalizado: é o corpo inteiro que o Better Auth recebe e grava. Nenhuma das
 * respostas ecoa o que veio no corpo.
 */
export async function checkSignUp(
  input: SignUpCheckInput,
): Promise<SignUp | undefined> {
  if (input.path !== SIGN_UP_PATH) return undefined;

  const parsed = signUpSchema.safeParse(input.body ?? {});
  if (!parsed.success) {
    throw new APIError('BAD_REQUEST', {
      code: signUpErrorCodes.validation,
      message: signUpErrorMessages.validation,
      fields: toSignUpFieldErrors(parsed.error),
    });
  }

  const existing = await input.findUserByEmail(parsed.data.email);
  if (existing) {
    throw new APIError('UNPROCESSABLE_ENTITY', {
      code: signUpErrorCodes.userAlreadyExists,
      message: signUpErrorMessages.userAlreadyExists,
    });
  }
  return parsed.data;
}

/**
 * Hook `before` do Better Auth (ADR-0010) do Módulo Contas. Com `requireEmailVerification`, a
 * biblioteca responderia 200 com um usuário sintético ao e-mail existente e registraria o e-mail
 * no log; o hook recusa antes, com 422 (spec, Decisões).
 */
export const signUpHook = createAuthMiddleware(async (ctx) => {
  const signUp = await checkSignUp({
    path: ctx.path,
    body: ctx.body,
    findUserByEmail: (email) =>
      ctx.context.internalAdapter.findUserByEmail(email),
  });
  if (!signUp) return;
  // Só o que o `signUpSchema` validou segue para o Better Auth: campos fora do contrato (`image`,
  // `callbackURL`, `rememberMe`, chaves extras) não chegam a ele nem ao banco. O `context`
  // devolvido por um hook é mesclado (defu) sobre o corpo original e não remove chaves, por isso o
  // corpo é reescrito no próprio objeto que o endpoint recebe.
  const body = ctx.body as Record<string, unknown>;
  for (const key of Object.keys(body)) Reflect.deleteProperty(body, key);
  Object.assign(body, signUp);
});

export type SignUpHook = typeof signUpHook;
