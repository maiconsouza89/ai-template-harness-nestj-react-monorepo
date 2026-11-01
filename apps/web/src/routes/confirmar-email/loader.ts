import { verifyEmailCodes, type VerifyEmailState } from '@app/contracts';
import type { ShouldRevalidateFunctionArgs } from 'react-router';
import { ApiUnavailableError, apiFetch } from '../../lib/http.js';

/**
 * Estado da tela `/confirmar-email`: um dos quatro de `verifyEmailStates` ou `unavailable`,
 * quando a API não respondeu e não se sabe se a conta foi confirmada.
 */
export interface VerifyEmailLoaderData {
  state: VerifyEmailState | 'unavailable';
}

/** Lê o `code` do corpo JSON; corpo que não é JSON vira `undefined`. */
async function readCode(response: Response): Promise<unknown> {
  try {
    const body = (await response.json()) as { code?: unknown } | null;
    return body?.code;
  } catch {
    return undefined;
  }
}

/**
 * `loader` de `/confirmar-email?token=`: confirma o link por `GET /api/auth/verify-email`, sem
 * `callbackURL`, e devolve o estado da tela. Sem `token` devolve o link que não vale sem chamar a
 * API. 200 ativa a conta, ou diz que ela já estava ativa com `ALREADY_VERIFIED`; 401
 * `TOKEN_EXPIRED` é o link vencido; qualquer outro 4xx (`INVALID_TOKEN`, `USER_NOT_FOUND`) é o
 * link que não vale. API fora ou 5xx viram `unavailable`, sem a página de erro (spec, Tratamento
 * de erros).
 */
export async function verifyEmailLoader({
  request,
}: {
  request: Request;
}): Promise<VerifyEmailLoaderData> {
  const token = new URL(request.url).searchParams.get('token');
  if (!token) {
    return { state: 'invalid' };
  }

  let response: Response;
  try {
    response = await apiFetch(
      `/api/auth/verify-email?${new URLSearchParams({ token }).toString()}`,
    );
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return { state: 'unavailable' };
    }
    throw error;
  }

  const code = await readCode(response);
  if (response.ok) {
    return {
      state:
        code === verifyEmailCodes.alreadyVerified
          ? 'alreadyVerified'
          : 'verified',
    };
  }
  if (response.status >= 400 && response.status < 500) {
    return {
      state: code === verifyEmailCodes.tokenExpired ? 'expired' : 'invalid',
    };
  }
  return { state: 'unavailable' };
}

/**
 * A `action` do reenvio não refaz a confirmação: depois de uma submissão o loader desta rota não
 * roda de novo (spec, Regras e fluxos; contrato UI-REENVIO-01). Navegação para outro link segue o
 * padrão do roteador.
 */
export function shouldRevalidateVerifyEmail({
  formMethod,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs): boolean {
  if (formMethod !== undefined && formMethod.toUpperCase() !== 'GET') {
    return false;
  }
  return defaultShouldRevalidate;
}
