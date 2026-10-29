import { webEnv } from './env.js';

/** A API não respondeu (rede fora, servidor parado, DNS). */
export class ApiUnavailableError extends Error {
  override readonly name = 'ApiUnavailableError';

  constructor(url: string, options?: ErrorOptions) {
    super(`O servidor não respondeu em ${url}`, options);
  }
}

/**
 * Cliente HTTP da SPA: prefixa `VITE_API_URL` e envia o cookie de sessão em toda requisição
 * (`credentials: "include"`). Falha de rede vira `ApiUnavailableError`; status HTTP é do chamador.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = `${webEnv().VITE_API_URL}${path}`;
  try {
    return await fetch(url, { ...init, credentials: 'include' });
  } catch (cause) {
    throw new ApiUnavailableError(url, { cause });
  }
}
