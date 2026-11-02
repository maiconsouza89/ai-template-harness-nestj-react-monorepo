import { requestPasswordResetSchema, signUpMessages } from '@app/contracts';
import { ApiUnavailableError, apiFetch } from '../../lib/http.js';

/** Resultado do botão "Enviar o link" da tela `/recuperar-senha`. */
export type RequestPasswordResetResult =
  | { status: 'sent' }
  | { status: 'invalid'; error: string }
  | { status: 'too-many' }
  | { status: 'unavailable' };

/**
 * `action` de `/recuperar-senha`: valida o campo "E-mail" pelo `requestPasswordResetSchema` de
 * Contratos e só então chama `POST /api/auth/request-password-reset`, sem `redirectTo`: o link do
 * e-mail é montado pela API com a origem da SPA. O 200 vem com e sem conta e vira o aviso neutro;
 * 429 é o limite de pedidos; 400 é o e-mail recusado pela API; API fora ou outro status é o aviso
 * de servidor fora.
 */
export async function requestPasswordResetAction({
  request,
}: {
  request: Request;
}): Promise<RequestPasswordResetResult> {
  const form = await request.formData();
  const parsed = requestPasswordResetSchema.safeParse({
    email: form.get('email') ?? '',
  });
  if (!parsed.success) {
    return {
      status: 'invalid',
      error: parsed.error.issues[0]?.message ?? signUpMessages.emailInvalid,
    };
  }

  let response: Response;
  try {
    response = await apiFetch('/api/auth/request-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return { status: 'unavailable' };
    }
    throw error;
  }

  if (response.ok) {
    return { status: 'sent' };
  }
  if (response.status === 429) {
    return { status: 'too-many' };
  }
  if (response.status === 400) {
    return { status: 'invalid', error: signUpMessages.emailInvalid };
  }
  return { status: 'unavailable' };
}
