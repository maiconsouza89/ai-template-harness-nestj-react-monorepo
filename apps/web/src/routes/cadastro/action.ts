import {
  signUpErrorCodes,
  signUpSchema,
  toSignUpFieldErrors,
  type FieldError,
  type SignUpField,
} from '@app/contracts';
import { ApiUnavailableError, apiFetch } from '../../lib/http.js';

/** Mensagem a mostrar abaixo de cada campo recusado. */
export type SignUpFieldErrors = Partial<Record<SignUpField, string>>;

/** Resultado do envio do formulário de cadastro (`intent` igual a `sign-up`). */
export type SignUpResult =
  | { intent: 'sign-up'; status: 'sent'; email: string }
  | { intent: 'sign-up'; status: 'invalid'; fieldErrors: SignUpFieldErrors }
  | { intent: 'sign-up'; status: 'exists' }
  | { intent: 'sign-up'; status: 'too-many' }
  | { intent: 'sign-up'; status: 'unavailable' };

/** Resultado do botão "Reenviar o link" (`intent` igual a `resend`). */
export type ResendResult = {
  intent: 'resend';
  status: 'resent' | 'too-many' | 'unavailable';
};

export type SignUpActionData = SignUpResult | ResendResult;

function toFieldErrors(fields: readonly FieldError[]): SignUpFieldErrors {
  const errors: SignUpFieldErrors = {};
  for (const { field, message } of fields) {
    errors[field] ??= message;
  }
  return errors;
}

function postJson(path: string, body: unknown): Promise<Response> {
  return apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Lê a lista `fields` do 400 `VALIDATION_ERROR`; corpo fora do formato vira lista vazia. */
async function readFields(response: Response): Promise<FieldError[]> {
  try {
    const body = (await response.json()) as {
      code?: unknown;
      fields?: unknown;
    };
    if (
      body.code === signUpErrorCodes.validation &&
      Array.isArray(body.fields)
    ) {
      return body.fields as FieldError[];
    }
  } catch {
    // Corpo que não é JSON: cai no aviso genérico abaixo.
  }
  return [];
}

async function signUp(form: FormData): Promise<SignUpResult> {
  const parsed = signUpSchema.safeParse({
    name: form.get('name') ?? '',
    email: form.get('email') ?? '',
    password: form.get('password') ?? '',
  });
  if (!parsed.success) {
    return {
      intent: 'sign-up',
      status: 'invalid',
      fieldErrors: toFieldErrors(toSignUpFieldErrors(parsed.error)),
    };
  }

  let response: Response;
  try {
    response = await postJson('/api/auth/sign-up/email', parsed.data);
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return { intent: 'sign-up', status: 'unavailable' };
    }
    throw error;
  }

  if (response.ok) {
    return { intent: 'sign-up', status: 'sent', email: parsed.data.email };
  }
  if (response.status === 400) {
    const fields = await readFields(response);
    if (fields.length > 0) {
      return {
        intent: 'sign-up',
        status: 'invalid',
        fieldErrors: toFieldErrors(fields),
      };
    }
  }
  // 422 cobre USER_ALREADY_EXISTS e, na corrida entre dois cadastros, FAILED_TO_CREATE_USER.
  if (response.status === 422) {
    return { intent: 'sign-up', status: 'exists' };
  }
  if (response.status === 429) {
    return { intent: 'sign-up', status: 'too-many' };
  }
  return { intent: 'sign-up', status: 'unavailable' };
}

async function resend(form: FormData): Promise<ResendResult> {
  const email = String(form.get('email') ?? '');
  let response: Response;
  try {
    response = await postJson('/api/auth/send-verification-email', { email });
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return { intent: 'resend', status: 'unavailable' };
    }
    throw error;
  }
  if (response.ok) {
    return { intent: 'resend', status: 'resent' };
  }
  if (response.status === 429) {
    return { intent: 'resend', status: 'too-many' };
  }
  return { intent: 'resend', status: 'unavailable' };
}

/**
 * `action` de `/cadastro`. O cadastro valida pelo `signUpSchema` de Contratos antes de chamar a
 * API, e só chama `POST /api/auth/sign-up/email` com o formulário válido; o reenvio chama
 * `POST /api/auth/send-verification-email` com o e-mail do cadastro aceito.
 */
export async function signUpAction({
  request,
}: {
  request: Request;
}): Promise<SignUpActionData> {
  const form = await request.formData();
  return form.get('intent') === 'resend' ? resend(form) : signUp(form);
}
