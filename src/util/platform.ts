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

/**
 * iOS kabuğunda mıyız?
 *
 * Reklam birimi kimlikleri için gerekiyor: AdMob'da Android ve iOS AYRI
 * birer uygulama, dolayısıyla birim kimlikleri de ayrı. Aynı kimliği iki
 * platformda kullanmak "geçersiz etkinlik" sayılıyor.
 */
export function isIos(): boolean {
  try {
    return Capacitor.getPlatform() === 'ios';
  } catch {
    return false;
  }
}
