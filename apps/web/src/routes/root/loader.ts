import { sessionResponseSchema, type SessionResponse } from '@app/contracts';
import { ApiUnavailableError, apiFetch } from '../../lib/http.js';

export interface RootLoaderData {
  /** `null` sem sessão aberta (401); a conta e o papel com sessão válida (200). */
  session: SessionResponse | null;
}

/**
 * Cria o `loader` da rota raiz, que lê a sessão pela API. Outros status viram erro de rota,
 * mostrado pela página de erro. Com a API fora do ar (`ApiUnavailableError`), a primeira leitura
 * cai na página de erro; uma releitura, como a que o roteador faz depois de qualquer `action`,
 * mantém a última sessão lida, para a tela aberta não perder o que foi digitado e mostrar o
 * próprio aviso de servidor fora. Assim nenhuma rota precisa se declarar neutra para a sessão.
 */
export function createRootLoader(): () => Promise<RootLoaderData> {
  let last: RootLoaderData | undefined;

  return async function rootLoader() {
    let response: Response;
    try {
      response = await apiFetch('/api/v1/session');
    } catch (error) {
      if (error instanceof ApiUnavailableError && last !== undefined) {
        return last;
      }
      throw error;
    }
    if (response.status === 401) {
      last = { session: null };
      return last;
    }
    if (!response.ok) {
      throw new Response(null, {
        status: response.status,
        statusText: response.statusText,
      });
    }
    last = { session: sessionResponseSchema.parse(await response.json()) };
    return last;
  };
}

/** O `loader` da rota raiz usado pelo roteador. */
export const rootLoader = createRootLoader();
