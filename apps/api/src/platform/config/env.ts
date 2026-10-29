import { z } from 'zod';

/** Valor vazio no `.env` (`COOKIE_DOMAIN=`) conta como ausente, para as variáveis opcionais. */
const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);
const optionalString = () =>
  z.preprocess(emptyToUndefined, z.string().optional());
const optionalUrl = () => z.preprocess(emptyToUndefined, z.url().optional());

/**
 * Variáveis de ambiente da API (spec da fundação, "Variáveis de ambiente"). Validadas com Zod 4
 * na subida (ADR-0023): falta ou valor inválido derruba o processo nomeando a variável.
 * `ADMIN_EMAIL` e `ADMIN_PASSWORD` ficam de fora: só o seed do `make db-setup` as lê.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  WEB_ORIGIN: z.url(),
  COOKIE_DOMAIN: optionalString(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  SMTP_FROM: z.string().min(1),
  SMTP_USER: optionalString(),
  SMTP_PASSWORD: optionalString(),
  OTEL_EXPORTER_OTLP_ENDPOINT: optionalUrl(),
  PORT: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(65535).default(3000),
  ),
  LOG_LEVEL: z.preprocess(
    emptyToUndefined,
    z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
  ),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Lançado por `loadEnv()`; a mensagem nomeia as variáveis, nunca imprime valor nenhum.
 * Sem parameter property no construtor: o seed (`prisma/seed.ts`) carrega este módulo direto no
 * Node, que só apaga tipos e recusa sintaxe que gera código.
 */
export class EnvValidationError extends Error {
  override readonly name = 'EnvValidationError';
  readonly variables: readonly string[];

  constructor(variables: readonly string[]) {
    super(`Configuração inválida; corrija no .env: ${variables.join(', ')}`);
    this.variables = variables;
  }
}

/**
 * Valida a configuração a partir de `source` (por padrão `process.env`). Cada problema vira
 * `NOME (ausente)` ou `NOME (inválida: motivo)`, com o motivo do Zod, que não ecoa a entrada.
 */
export function loadEnv(
  source: Record<string, string | undefined> = process.env,
): Env {
  const result = envSchema.safeParse(source);
  if (result.success) {
    return result.data;
  }
  const seen = new Set<string>();
  const variables: string[] = [];
  for (const issue of result.error.issues) {
    const name = String(issue.path[0] ?? '?');
    if (seen.has(name)) continue;
    seen.add(name);
    const value = source[name];
    variables.push(
      value === undefined || value === ''
        ? `${name} (ausente)`
        : `${name} (inválida: ${issue.message})`,
    );
  }
  throw new EnvValidationError(variables);
}
