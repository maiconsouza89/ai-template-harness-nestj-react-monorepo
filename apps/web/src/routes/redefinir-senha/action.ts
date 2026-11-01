import {
  resetPasswordCodes,
  resetPasswordFormSchema,
  toResetPasswordFieldErrors,
  type ResetPasswordField,
  type ResetPasswordFieldError,
} from '@app/contracts';
import { ApiUnavailableError, apiFetch } from '../../lib/http.js';

/** Mensagem a mostrar abaixo de cada campo recusado. */
export type ResetPasswordFieldErrors = Partial<
  Record<ResetPasswordField, string>
>;

/** Resultado do botão "Salvar a nova senha" da tela `/redefinir-senha`. */
export type ResetPasswordResult =
  | { status: 'changed' }
  | { status: 'invalid'; fieldErrors: ResetPasswordFieldErrors }
  | { status: 'invalid-token' }
  | { status: 'too-many' }
  | { status: 'unavailable' };

function toFieldErrors(
  fields: readonly ResetPasswordFieldError[],
): ResetPasswordFieldErrors {
  const errors: ResetPasswordFieldErrors = {};
  for (const { field, message } of fields) {
    errors[field] ??= message;
  }
  return errors;
}

/** Lê `code` e `fields` do corpo JSON de erro; corpo que não é JSON vira objeto vazio. */
async function readError(
  response: Response,
): Promise<{ code?: unknown; fields?: unknown }> {
  try {
    const body = (await response.json()) as {
      code?: unknown;
      fields?: unknown;
    } | null;
    return body ?? {};
  } catch {
    return {};
  }
}

/**
 * `action` de `/redefinir-senha?token=`: confere a nova senha pela regra e a igualdade com a
 * confirmação pelo `resetPasswordFormSchema` de Contratos, sem chamar a API quando falha, e só
 * então envia `POST /api/auth/reset-password` com o token da URL e a nova senha. 200 é a senha
 * alterada; 400 `VALIDATION_ERROR` volta como erro de campo; os outros 4xx (`INVALID_TOKEN`,
 * `USER_NOT_FOUND`) e a falta de token são o link que não vale; 429 é o limite; API fora ou 5xx
 * é o aviso de servidor fora. O loader não roda de novo depois dela (`shouldRevalidate`).
 */
export async function resetPasswordAction({
  request,
}: {
  request: Request;
}): Promise<ResetPasswordResult> {
  const form = await request.formData();
  const parsed = resetPasswordFormSchema.safeParse({
    newPassword: form.get('newPassword') ?? '',
    confirmPassword: form.get('confirmPassword') ?? '',
  });
  if (!parsed.success) {
    return {
      status: 'invalid',
      fieldErrors: toFieldErrors(toResetPasswordFieldErrors(parsed.error)),
    };
  }

  const token = new URL(request.url).searchParams.get('token');
  if (!token) {
    return { status: 'invalid-token' };
  }

  let response: Response;
  try {
    response = await apiFetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: parsed.data.newPassword }),
    });
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return { status: 'unavailable' };
    }
    throw error;
  }

  if (response.ok) {
    return { status: 'changed' };
  }
  if (response.status === 429) {
    return { status: 'too-many' };
  }
  if (response.status >= 400 && response.status < 500) {
    const body = await readError(response);
    if (
      body.code === resetPasswordCodes.validation &&
      Array.isArray(body.fields) &&
      body.fields.length > 0
    ) {
      return {
        status: 'invalid',
        fieldErrors: toFieldErrors(body.fields as ResetPasswordFieldError[]),
      };
    }
    return { status: 'invalid-token' };
  }
  return { status: 'unavailable' };
}
