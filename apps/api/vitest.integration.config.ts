import { defineConfig } from 'vitest/config';

// Testes de integração: sobem a aplicação inteira com createNestApplication() e Supertest.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/integration/**/*.int-spec.ts'],
  },
});
