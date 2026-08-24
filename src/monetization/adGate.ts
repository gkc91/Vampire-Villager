import { hasEntitlement } from './entitlements';

/**
 * Reklam noktası: GAME_END'de kazanan açıklanmadan ÖNCE (05-monetization.md).
 * MVP'de reklam YOK; yalnız kısa bir "sonuçlar hazırlanıyor" geçişi.
 */
export const PRE_RESULT_DELAY_MS = 2000;

export async function showPreResultAd(): Promise<void> {
  if (hasEntitlement('no_ads')) {
    // Reklamsız kullanıcı: yine de anlatım ritmi için kısa geçiş.
    await wait(PRE_RESULT_DELAY_MS);
    return;
  }
  // İleride: Capacitor'da AdMob interstitial; web'de atlanır.
  await wait(PRE_RESULT_DELAY_MS);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
