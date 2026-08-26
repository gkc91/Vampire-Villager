import { Capacitor } from '@capacitor/core';

/**
 * Mağazadan indirilen uygulamada mıyız, tarayıcıda mı?
 *
 * Rol katmanları ve satın alma buna bağlı: web sürümü çekirdek rollerle
 * oynanır, uygulama daha fazlasını açar (bkz. `src/game/unlocks.ts`).
 */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false; // test ortamı / eski tarayıcı
  }
}
