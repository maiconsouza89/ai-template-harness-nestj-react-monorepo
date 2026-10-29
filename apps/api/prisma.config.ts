import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

/**
 * Configuração da CLI do Prisma 7 (ADR-0008). A 7 não carrega o `.env` sozinha: quando
 * `DATABASE_URL` não está no ambiente (host, fora do Compose), carrega o `.env` da raiz do
 * monorepo. No Compose e no `scripts/test.sh` a variável já vem do ambiente e nada é lido.
 * `prisma generate` não precisa da URL; `migrate` e `db seed` falham nomeando-a se faltar.
 */
const rootEnv = resolve(import.meta.dirname, '../../.env');
if (!process.env.DATABASE_URL && existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Seed idempotente do primeiro admin (spec da fundação, "Modelo de dados"), rodado por
    // `prisma db seed` dentro do `make db-setup`. O Node 26 executa o TypeScript direto.
    seed: 'node prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
