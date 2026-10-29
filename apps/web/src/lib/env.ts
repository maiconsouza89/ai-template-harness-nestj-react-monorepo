import { webEnvSchema, type WebEnv } from '@app/contracts';

/** Lê e valida as variáveis públicas da SPA; falha com o nome da variável, nunca com o valor. */
export function webEnv(): WebEnv {
  const result = webEnvSchema.safeParse({
    VITE_API_URL: import.meta.env.VITE_API_URL,
  });
  if (!result.success) {
    const names = result.error.issues
      .map((issue) => issue.path.join('.'))
      .join(', ');
    throw new Error(`Configuração da SPA inválida: ${names}`);
  }
  return result.data;
}
