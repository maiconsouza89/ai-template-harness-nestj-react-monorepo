import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Tailwind CSS 4 pelo plugin do Vite, no lugar do PostCSS (ADR-0027).
  plugins: [react(), tailwindcss()],
  // O .env mora na raiz do monorepo, junto do .env.example; a SPA lê dali as variáveis VITE_*.
  envDir: '../..',
  server: {
    host: true,
    port: 5173,
    // WATCH_POLLING=true no .env liga o polling no Compose quando o inotify não chega ao
    // container (repositório em /mnt/c no WSL2); custa CPU, por isso fica desligado por padrão.
    watch: { usePolling: process.env.WATCH_POLLING === 'true' },
  },
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
});
