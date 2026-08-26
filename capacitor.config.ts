import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor kabuğu (M6). appId stüdyo alan adının tersidir
 * (com.lampwickgames.<oyun>) — sonraki oyunlar da aynı çatı altında
 * toplansın diye. YAYINLANDIKTAN SONRA DEĞİŞTİRİLEMEZ.
 *
 * Platform klasörleri repoda tutulmaz:
 *   npm run build && npx cap add android && npx cap sync
 * Derin link ayarları için docs/NATIVE.md.
 */
const config: CapacitorConfig = {
  appId: 'com.lampwickgames.vampirkoylu',
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
