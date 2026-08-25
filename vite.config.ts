import { execSync } from 'node:child_process';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Paket damgası. İki cihazın aynı sürümü çalıştırıp çalıştırmadığını
 * uzaktan anlamanın tek yolu; bayat servis çalışanı bu satırda yakalanır.
 */
function buildId(): string {
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  try {
    return `${execSync('git rev-parse --short HEAD').toString().trim()} · ${stamp}`;
  } catch {
    return stamp;
  }
}

// Statik barındırma (Cloudflare Pages / GitHub Pages) hedefi.
// GitHub Pages alt yolda yayınlanırsa BASE_PATH ile override edilir.
export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(buildId()) },
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  server: { host: true, port: 5173 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
