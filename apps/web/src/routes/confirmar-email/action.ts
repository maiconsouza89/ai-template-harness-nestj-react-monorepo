import { resendVerificationEmailSchema, signUpMessages } from '@app/contracts';
import { ApiUnavailableError, apiFetch } from '../../lib/http.js';

/** Resultado do botão "Reenviar o link" da tela `/confirmar-email`. */
export type VerifyEmailResendResult =
  | { status: 'sent' }
  | { status: 'invalid'; error: string }
  | { status: 'too-many' }
  | { status: 'unavailable' };

/**
 * `action` de `/confirmar-email`: valida o campo "E-mail" pelo `resendVerificationEmailSchema` de
 * Contratos e só então chama `POST /api/auth/send-verification-email`. O 200 vem com e sem conta
 * pendente e vira o aviso genérico; 429 é o limite de reenvios; API fora ou outro status é o
 * aviso de servidor fora.
 */
export async function verifyEmailAction({
  request,
}: {
  request: Request;
}): Promise<VerifyEmailResendResult> {
  const form = await request.formData();
  const parsed = resendVerificationEmailSchema.safeParse({
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
    response = await apiFetch('/api/auth/send-verification-email', {
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
