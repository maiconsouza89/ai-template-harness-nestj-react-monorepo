import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vitest/config';

// Testes de integração: sobem a aplicação inteira com createNestApplication() e Supertest.
// A configuração vem do .env.test versionado (serviços do Compose vistos do host).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/integration/**/*.int-spec.ts'],
    // Um arquivo por vez: cada createTestApp apaga os contadores do rate limit no Valkey, e um
    // arquivo subindo em paralelo zeraria a janela de cadastro que outro está medindo.
    fileParallelism: false,
    env: parseEnv(
      readFileSync(new URL('./.env.test', import.meta.url), 'utf8'),
    ),
  },
});
