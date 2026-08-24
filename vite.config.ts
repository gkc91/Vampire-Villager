import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Statik barındırma (Cloudflare Pages / GitHub Pages) hedefi.
// GitHub Pages alt yolda yayınlanırsa BASE_PATH ile override edilir.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  server: { host: true, port: 5173 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
