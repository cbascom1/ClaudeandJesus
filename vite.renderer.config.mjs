import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

/**
 * Renderer-only Vite config for browser preview / visual validation.
 *
 * Unlike `electron.vite.config.ts`, this runs the React app in a plain browser
 * (no Electron main/preload processes). The app must handle `window.api` being
 * undefined — see `src/api-mock.ts`, which is injected via `src/main.tsx`.
 */
export default defineConfig({
  root: resolve(new URL('.', import.meta.url).pathname, 'src'),
  resolve: {
    alias: {
      '@': resolve(new URL('.', import.meta.url).pathname, 'src'),
      '@shared': resolve(new URL('.', import.meta.url).pathname, 'src/types')
    }
  },
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true
  },
  build: {
    outDir: resolve(new URL('.', import.meta.url).pathname, 'out/renderer-only')
  }
});
