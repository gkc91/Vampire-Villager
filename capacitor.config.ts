import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor kabuğu (M6). Platform klasörleri repoda tutulmaz:
 *   npm run build && npx cap add android && npx cap sync
 * Derin link ayarları için docs/NATIVE.md.
 */
const config: CapacitorConfig = {
  appId: 'com.vampirkoylu.app',
  appName: 'Vampir Köylü',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
