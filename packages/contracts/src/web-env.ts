import { z } from 'zod';

/** Variáveis públicas da SPA, lidas de `import.meta.env` no navegador. */
export const webEnvSchema = z.object({
  /** URL da API vista pelo navegador, sem barra final (ex.: http://localhost:3000). */
  VITE_API_URL: z.url().transform((url) => url.replace(/\/+$/, '')),
});
export type WebEnv = z.infer<typeof webEnvSchema>;
