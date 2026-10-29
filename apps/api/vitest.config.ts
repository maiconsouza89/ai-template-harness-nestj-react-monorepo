import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vitest/config';

// Testes de unidade: *.spec.ts ao lado do código. A configuração vem do .env.test versionado.
export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
    env: parseEnv(
      readFileSync(new URL('./.env.test', import.meta.url), 'utf8'),
    ),
  },
});
