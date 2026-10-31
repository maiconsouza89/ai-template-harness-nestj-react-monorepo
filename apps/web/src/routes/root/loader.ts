import { sessionResponseSchema, type SessionResponse } from '@app/contracts';
import type { ShouldRevalidateFunctionArgs } from 'react-router';
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

/** Rotas cuja `action` nunca abre nem fecha sessão: o cadastro só cria conta pendente. */
const sessionNeutralActions: readonly string[] = ['/cadastro'];

/**
 * Depois de uma `action` que não mexe na sessão, a raiz não relê `/api/v1/session`: com a API
 * fora, a releitura derrubaria a tela na página de erro e o formulário perderia o que foi
 * digitado, em vez de mostrar o aviso de servidor fora.
 */
export function rootShouldRevalidate({
  formAction,
  defaultShouldRevalidate,
}: Pick<
  ShouldRevalidateFunctionArgs,
  'formAction' | 'defaultShouldRevalidate'
>): boolean {
  if (formAction !== undefined && sessionNeutralActions.includes(formAction)) {
    return false;
  }
  return defaultShouldRevalidate;
}
