import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // O .env mora na raiz do monorepo, junto do .env.example; a SPA lê dali as variáveis VITE_*.
  envDir: '../..',
  server: {
    host: true,
    port: 5173,
  },
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
});
