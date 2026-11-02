import type { ShouldRevalidateFunctionArgs } from 'react-router';
import { ApiUnavailableError, apiFetch } from '../../lib/http.js';

/**
 * Estado da tela `/redefinir-senha` ao abrir: `form` com o link dentro do prazo, `invalid` com o
 * link vencido, já usado, trocado por novo pedido ou sem token, e `unavailable` quando a API não
 * respondeu e não se sabe se o link vale.
 */
export interface ResetPasswordLoaderData {
  state: 'form' | 'invalid' | 'unavailable';
}

/**
 * `loader` de `/redefinir-senha?token=`: checa o link por `GET /api/auth/reset-password-status`,
 * que não consome o registro, e devolve o estado da tela. Sem `token` devolve o link que não vale
 * sem chamar a API. 200 mostra o formulário; qualquer 4xx (`INVALID_TOKEN`) é o link que não vale;
 * API fora ou 5xx viram `unavailable`, sem a página de erro (spec, Tratamento de erros).
 */
export async function resetPasswordLoader({
  request,
}: {
  request: Request;
}): Promise<ResetPasswordLoaderData> {
  const token = new URL(request.url).searchParams.get('token');
  if (!token) {
    return { state: 'invalid' };
  }

  let response: Response;
  try {
    response = await apiFetch(
      `/api/auth/reset-password-status?${new URLSearchParams({ token }).toString()}`,
    );
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return { state: 'unavailable' };
    }
    throw error;
  }

  if (response.ok) {
    return { state: 'form' };
  }
  if (response.status >= 400 && response.status < 500) {
    return { state: 'invalid' };
  }
  return { state: 'unavailable' };
}

/**
 * A checagem não se refaz depois da `action` da troca: com o link já consumido, a revalidação
 * trocaria "Senha alterada" por "Link inválido" (spec, Regras e fluxos; contrato UI-REDEFINIR-02).
 * Navegação para outro link segue o padrão do roteador.
 */
export function shouldRevalidateResetPassword({
  formMethod,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs): boolean {
  if (formMethod !== undefined && formMethod.toUpperCase() !== 'GET') {
    return false;
  }
  return defaultShouldRevalidate;
}
