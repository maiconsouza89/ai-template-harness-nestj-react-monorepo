import {
  apiErrorBodySchema,
  fieldErrorsFrom,
  SIGN_UP_ERROR_CODES,
  signUpSchema,
} from '@app/contracts';
import type { ActionFunctionArgs } from 'react-router';
import { ApiUnavailableError, apiFetch } from '../../lib/http.js';

/** Rota da SPA que trata o link de confirmação (RF-002); vai como `callbackURL` do link. */
export const CONFIRM_EMAIL_PATH = '/confirmar-email';

/** Valor do campo `intent` do formulário que pede o reenvio do link na tela de sucesso. */
export const RESEND_INTENT = 'resend';

export const SIGN_UP_MESSAGES = {
  duplicate: 'Este e-mail já tem conta.',
  rateLimited: 'Muitas tentativas. Aguarde um minuto e tente de novo.',
  unavailable: 'O servidor não respondeu. Tente de novo.',
  unexpected: 'Não foi possível criar a conta. Tente de novo.',
  resendFailed: 'Não foi possível reenviar o link. Tente de novo.',
} as const;

/** O que o formulário devolve preenchido depois de um erro: nunca a senha. */
export interface SignUpValues {
  name: string;
  email: string;
}

export type SignUpActionData =
  | {
      status: 'invalid';
      values: SignUpValues;
      /** Mensagem por campo (`name`, `email`, `password`), a primeira de cada um. */
      fields: Record<string, string>;
    }
  | { status: 'duplicate'; values: SignUpValues }
  | { status: 'failed'; values: SignUpValues; message: string }
  | { status: 'success'; email: string }
  | { status: 'resent'; email: string }
  | { status: 'resend-failed'; email: string; message: string };

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

function confirmEmailURL(request: Request): string {
  return new URL(CONFIRM_EMAIL_PATH, request.url).href;
}

function postJson(path: string, body: unknown): Promise<Response> {
  return apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function readErrorBody(response: Response) {
  try {
    const parsed = apiErrorBodySchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function toFieldMap(
  fields: readonly { field: string; message: string }[],
): Record<string, string> {
  return Object.fromEntries(fields.map((item) => [item.field, item.message]));
}

/** Reenvia o link de confirmação pela rota da biblioteca (`/send-verification-email`). */
async function resend(
  request: Request,
  form: FormData,
): Promise<SignUpActionData> {
  const email = text(form, 'email');
  let response: Response;
  try {
    response = await postJson('/api/auth/send-verification-email', {
      email,
      callbackURL: confirmEmailURL(request),
    });
  } catch (error) {
    if (!(error instanceof ApiUnavailableError)) throw error;
    return {
      status: 'resend-failed',
      email,
      message: SIGN_UP_MESSAGES.unavailable,
    };
  }
  if (response.ok) return { status: 'resent', email };
  return {
    status: 'resend-failed',
    email,
    message:
      response.status === 429
        ? SIGN_UP_MESSAGES.rateLimited
        : SIGN_UP_MESSAGES.resendFailed,
  };
}

/**
 * Action da rota `/cadastro` (RF-001). Valida com `signUpSchema` de Contratos antes de chamar a
 * API, envia o cadastro ao Better Auth com o `callbackURL` da tela de confirmação e traduz a
 * resposta para a tela: sucesso, campos inválidos, e-mail já cadastrado, excesso de tentativas e
 * servidor fora. Com `intent` igual a `resend`, reenvia o link da tela de sucesso.
 */
export async function signUpAction({
  request,
}: Pick<ActionFunctionArgs, 'request'>): Promise<SignUpActionData> {
  const form = await request.formData();
  if (text(form, 'intent') === RESEND_INTENT) return resend(request, form);

  const values: SignUpValues = {
    name: text(form, 'name'),
    email: text(form, 'email'),
  };
  const parsed = signUpSchema.safeParse({
    ...values,
    password: text(form, 'password'),
  });
  if (!parsed.success) {
    return {
      status: 'invalid',
      values,
      fields: toFieldMap(fieldErrorsFrom(parsed.error)),
    };
  }

  let response: Response;
  try {
    response = await postJson('/api/auth/sign-up/email', {
      ...parsed.data,
      callbackURL: confirmEmailURL(request),
    });
  } catch (error) {
    if (!(error instanceof ApiUnavailableError)) throw error;
    return { status: 'failed', values, message: SIGN_UP_MESSAGES.unavailable };
  }

  if (response.ok) return { status: 'success', email: parsed.data.email };
  if (response.status === 429) {
    return { status: 'failed', values, message: SIGN_UP_MESSAGES.rateLimited };
  }

  const body = await readErrorBody(response);
  if (body?.code === SIGN_UP_ERROR_CODES.USER_ALREADY_EXISTS) {
    return { status: 'duplicate', values };
  }
  if (body?.code === SIGN_UP_ERROR_CODES.VALIDATION_ERROR && body.fields) {
    return { status: 'invalid', values, fields: toFieldMap(body.fields) };
  }
  return { status: 'failed', values, message: SIGN_UP_MESSAGES.unexpected };
}
