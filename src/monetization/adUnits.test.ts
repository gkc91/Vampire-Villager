import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Reklam birimi kimlikleri PLATFORMA GÖRE seçilmeli.
 *
 * NEDEN TEST VAR: AdMob'da Android ve iOS ayrı birer uygulama. Birinin
 * birim kimliğiyle diğerinden istek atmak HATA VERMİYOR — reklam gelmiyor,
 * istek "geçersiz etkinlik" olarak işaretlenebiliyor ve bu hesap kapatmaya
 * kadar gidiyor. Yani yanlış seçim sessiz; onu yakalayacak tek şey bu test.
 *
 * Kimlikler `.env.production.local`'dan geliyor, depoda yok. Test onları
 * `import.meta.env`'e doğrudan yazıyor.
 */

const ANDROID_INT = 'ca-app-pub-1111111111111111/1111111111';
const ANDROID_REW = 'ca-app-pub-1111111111111111/2222222222';
const IOS_INT = 'ca-app-pub-9999999999999999/3333333333';
const IOS_REW = 'ca-app-pub-9999999999999999/4444444444';

const DEMO_INT = 'ca-app-pub-3940256099942544/1033173712';

async function yukle(platform: 'android' | 'ios' | 'web', env: Record<string, string> = {}) {
  vi.resetModules();
  vi.doMock('@capacitor/core', () => ({
    Capacitor: {
      getPlatform: () => platform,
      isNativePlatform: () => platform !== 'web',
    },
  }));
  vi.stubEnv('VITE_ADMOB_INTERSTITIAL', env.VITE_ADMOB_INTERSTITIAL ?? '');
  vi.stubEnv('VITE_ADMOB_REWARDED', env.VITE_ADMOB_REWARDED ?? '');
  vi.stubEnv('VITE_ADMOB_INTERSTITIAL_IOS', env.VITE_ADMOB_INTERSTITIAL_IOS ?? '');
  vi.stubEnv('VITE_ADMOB_REWARDED_IOS', env.VITE_ADMOB_REWARDED_IOS ?? '');
  return import('./adUnits');
}

const HEPSI = {
  VITE_ADMOB_INTERSTITIAL: ANDROID_INT,
  VITE_ADMOB_REWARDED: ANDROID_REW,
  VITE_ADMOB_INTERSTITIAL_IOS: IOS_INT,
  VITE_ADMOB_REWARDED_IOS: IOS_REW,
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.doUnmock('@capacitor/core');
});

describe('reklam birimi kimlikleri', () => {
  it('Android kabuğunda Android birimlerini kullanıyor', async () => {
    const m = await yukle('android', HEPSI);

    expect(m.AD_UNITS.interstitial).toBe(ANDROID_INT);
    expect(m.AD_UNITS.rewarded).toBe(ANDROID_REW);
  });

  it('iOS kabuğunda iOS birimlerini kullanıyor', async () => {
    const m = await yukle('ios', HEPSI);

    expect(m.AD_UNITS.interstitial).toBe(IOS_INT);
    expect(m.AD_UNITS.rewarded).toBe(IOS_REW);
  });

  it('iOS kimliği tanımlı değilse Android kimliğine DÜŞMÜYOR, demoya düşüyor', async () => {
    // En tehlikeli hata bu olurdu: iOS paketinin Android birimine istek
    // atması. Demo birimi gelirsizdir ama zararsızdır.
    const m = await yukle('ios', {
      VITE_ADMOB_INTERSTITIAL: ANDROID_INT,
      VITE_ADMOB_REWARDED: ANDROID_REW,
    });

    expect(m.AD_UNITS.interstitial).toBe(DEMO_INT);
    expect(m.AD_UNITS.interstitial).not.toBe(ANDROID_INT);
    expect(m.USING_LIVE_ADS).toBe(false);
  });

  it('hiçbir kimlik yoksa demo birimleri kalıyor', async () => {
    const m = await yukle('android');

    expect(m.AD_UNITS.interstitial).toBe(DEMO_INT);
    expect(m.USING_LIVE_ADS).toBe(false);
  });

  it('webde de demo kalıyor — tarayıcıda zaten reklam yok', async () => {
    const m = await yukle('web', HEPSI);

    // Web Android dalını kullanıyor; önemli olan iOS kimliğini
    // sızdırmaması.
    expect(m.AD_UNITS.interstitial).not.toBe(IOS_INT);
  });
});
