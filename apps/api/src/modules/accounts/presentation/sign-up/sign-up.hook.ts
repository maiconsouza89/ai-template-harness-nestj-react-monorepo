import {
  type SignUp,
  signUpErrorCodes,
  signUpErrorMessages,
  signUpSchema,
  toSignUpFieldErrors,
} from '@app/contracts';
import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';

/** Caminho do cadastro por e-mail e senha, relativo ao `basePath` do Better Auth. */
export const SIGN_UP_PATH = '/sign-up/email';

/** O que a checagem precisa da requisição: o caminho, o corpo e a busca de conta por e-mail. */
export interface SignUpCheckInput {
  path: string | undefined;
  body: unknown;
  findUserByEmail: (email: string) => Promise<unknown>;
  /** E-mail de `ADMIN_EMAIL`, reservado ao primeiro admin que o seed cria; opcional. */
  reservedEmail?: string;
}

/**
 * Regra do cadastro antes do Better Auth (spec, Contratos de interface): fora de `/sign-up/email`
 * não faz nada; corpo fora do `signUpSchema` de Contratos recusa com 400 `VALIDATION_ERROR` e a
 * lista `fields`; e-mail já cadastrado, procurado em minúsculas, recusa com 422
 * `USER_ALREADY_EXISTS`, e o mesmo vale para o e-mail reservado ao admin (`ADMIN_EMAIL`), em
 * qualquer caixa e sem dizer que o endereço é do admin. Válido, devolve só nome, e-mail e senha,
 * com o nome sem os espaços das pontas e o e-mail normalizado: é o corpo inteiro que o Better
 * Auth recebe e grava. Nenhuma das respostas ecoa o que veio no corpo.
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

  const reserved = input.reservedEmail?.toLowerCase() === parsed.data.email;
  if (reserved || (await input.findUserByEmail(parsed.data.email))) {
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
 * no log; o hook recusa antes, com 422 (spec, Decisões). `reservedEmail` é o `ADMIN_EMAIL`.
 */
export const createSignUpHook = (reservedEmail?: string) =>
  createAuthMiddleware(async (ctx) => {
    const signUp = await checkSignUp({
      path: ctx.path,
      body: ctx.body,
      findUserByEmail: (email) =>
        ctx.context.internalAdapter.findUserByEmail(email),
      reservedEmail,
    });
    if (!signUp) return;
    // Só o que o `signUpSchema` validou segue para o Better Auth: campos fora do contrato
    // (`image`, `callbackURL`, `rememberMe`, chaves extras) não chegam a ele nem ao banco. O
    // `context` devolvido por um hook é mesclado (defu) sobre o corpo original e não remove
    // chaves, por isso o corpo é reescrito no próprio objeto que o endpoint recebe.
    const body = ctx.body as Record<string, unknown>;
    for (const key of Object.keys(body)) Reflect.deleteProperty(body, key);
    Object.assign(body, signUp);
  });

export type SignUpHook = ReturnType<typeof createSignUpHook>;

/**
 * Campos de redirecionamento que o `originCheckMiddleware` do Better Auth confere contra
 * `trustedOrigins` antes de qualquer hook `before`: um `callbackURL` externo derrubaria o cadastro
 * com 403 `INVALID_CALLBACK_URL` antes de o hook descartá-lo.
 */
const REDIRECT_FIELDS = [
  'callbackURL',
  'redirectTo',
  'errorCallbackURL',
  'newUserCallbackURL',
] as const;

/**
 * Tira os campos de redirecionamento do corpo JSON e da query de um `POST` em `/sign-up/email`,
 * devolvendo uma requisição nova; nos demais casos, ou com corpo que não é objeto JSON, devolve
 * `undefined` e a requisição segue como veio (o hook responde 400 ao corpo inválido). O cadastro
 * não usa esses campos: o link de confirmação leva à SPA (spec, Decisões).
 */
export async function stripSignUpRedirects(
  request: Request,
  basePath: string,
): Promise<Request | undefined> {
  const url = new URL(request.url);
  if (request.method !== 'POST' || url.pathname !== basePath + SIGN_UP_PATH) {
    return undefined;
  }
  let body: unknown;
  try {
    body = await request.clone().json();
  } catch {
    return undefined;
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return undefined;
  }
  const fields = body as Record<string, unknown>;
  const hasRedirect = REDIRECT_FIELDS.some(
    (key) => key in fields || url.searchParams.has(key),
  );
  if (!hasRedirect) return undefined;
  for (const key of REDIRECT_FIELDS) {
    Reflect.deleteProperty(fields, key);
    url.searchParams.delete(key);
  }
  const headers = new Headers(request.headers);
  headers.delete('content-length');
  return new Request(url, {
    method: request.method,
    headers,
    body: JSON.stringify(fields),
    signal: request.signal,
  });
}

/**
 * Plugin do Módulo Contas que roda `stripSignUpRedirects` no `onRequest` do roteador do Better
 * Auth, antes da conferência de origem; o hook continua descartando o resto do que está fora do
 * contrato.
 */
export const createSignUpRequestPlugin = (basePath: string) =>
  ({
    id: 'sign-up-request',
    onRequest: async (request) => {
      const stripped = await stripSignUpRedirects(request, basePath);
      return stripped ? { request: stripped } : undefined;
    },
  }) satisfies BetterAuthPlugin;
