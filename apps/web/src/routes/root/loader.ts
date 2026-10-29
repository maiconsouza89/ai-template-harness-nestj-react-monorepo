import { sessionResponseSchema, type SessionResponse } from '@app/contracts';
import { apiFetch } from '../../lib/http.js';

export interface RootLoaderData {
  /** `null` sem sessão aberta (401); a conta e o papel com sessão válida (200). */
  session: SessionResponse | null;
}

/** Lê a sessão pela API. Outros status viram erro de rota, mostrado pela página de erro. */
export async function rootLoader(): Promise<RootLoaderData> {
  const response = await apiFetch('/api/v1/session');
  if (response.status === 401) {
    return { session: null };
  }
  if (!response.ok) {
    throw new Response(null, {
      status: response.status,
      statusText: response.statusText,
    });
  }
  return { session: sessionResponseSchema.parse(await response.json()) };
}
