import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Zaman aşımı YALNIZ reklamın YÜKLENMESİNE uygulanmalı, İZLENMESİNE değil.
 *
 * Gerçek cihazda çıkan hata (10 Eylül 2026): kullanıcı ödüllü reklamı
 * sonuna kadar izledi, roller açılmadı. Sebebi `prepare` ile `show`
 * birlikte 8 saniyelik zaman aşımına sarılmıştı; ödüllü video 15-30
 * saniye sürüyor, yani ödül gelmeden zaman aşımı fırlıyor, catch bloğu
 * yutuyor ve fonksiyon false dönüyordu. Reklam ekranda oynamaya devam
 * ettiği için kullanıcı hiçbir hata görmüyor, sadece ödülü alamıyordu.
 *
 * Yükleme aşamasında zaman aşımı DOĞRU ve kalmalı: doluluk yoksa SDK
 * sessizce bekleyebiliyor, oyunu orada tutamayız.
 *
 * TESTLERİN KURULUMU: sahte zamanlayıcıyla zamanı ilerletmeden önce
 * zamanlayıcının KURULMUŞ olması gerekiyor. adGate SDK'yı dinamik
 * `import()` ile alıyor, yani ilk çağrı bir mikro görev zinciri. Bu
 * yüzden sahte SDK, ilgili adım çağrıldığında haber veriyor ve testler
 * o haberi bekledikten sonra zamanı ilerletiyor. İlk yazımda bu yoktu
 * ve testler yanlış sebeplerden geçiyordu.
 */

interface SahteAdim<T> {
  cagrildi: Promise<void>;
  fn: () => Promise<T>;
}

/** Çağrıldığında haber veren, sonucu testin elinde olan sahte adım. */
function adim<T>(sonuc: (cozumle: (v: T) => void, reddet: (e: unknown) => void) => void): SahteAdim<T> {
  let haberVer!: () => void;
  const cagrildi = new Promise<void>((r) => {
    haberVer = r;
  });
  return {
    cagrildi,
    fn: () =>
      new Promise<T>((cozumle, reddet) => {
        haberVer();
        sonuc(cozumle, reddet);
      }),
  };
}

/** Hemen biten adım. */
const hemen = <T,>(v: T): SahteAdim<T> => adim<T>((cozumle) => cozumle(v));
/** Hiç bitmeyen adım (askıda kalan yükleme / kapanmayan reklam). */
const askida = <T,>(): SahteAdim<T> => adim<T>(() => {});

async function yukle(sdk: {
  prepareRewardVideoAd?: SahteAdim<void>;
  showRewardVideoAd?: SahteAdim<unknown>;
  prepareInterstitial?: SahteAdim<void>;
  showInterstitial?: SahteAdim<void>;
}) {
  vi.resetModules();
  vi.doMock('../util/platform', () => ({ isNativeApp: () => true }));
  vi.doMock('@capacitor-community/admob', () => ({
    AdMob: {
      initialize: async () => undefined,
      prepareRewardVideoAd: (sdk.prepareRewardVideoAd ?? hemen<void>(undefined)).fn,
      showRewardVideoAd: (sdk.showRewardVideoAd ?? hemen<unknown>({ amount: 1 })).fn,
      prepareInterstitial: (sdk.prepareInterstitial ?? hemen<void>(undefined)).fn,
      showInterstitial: (sdk.showInterstitial ?? hemen<void>(undefined)).fn,
    },
  }));
  return import('./adGate');
}

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
  vi.doUnmock('../util/platform');
  vi.doUnmock('@capacitor-community/admob');
});

describe('ödüllü reklam', () => {
  it('20 saniye izlense bile ödülü verir', async () => {
    vi.useFakeTimers();
    let odulVer!: (v: unknown) => void;
    const izleniyor = adim<unknown>((cozumle) => {
      odulVer = cozumle;
    });

    const m = await yukle({ showRewardVideoAd: izleniyor });
    const sonuc = m.watchRewardedForPremium();

    await izleniyor.cagrildi; // reklam ekranda; zaman aşımı kurulduysa işliyor
    await vi.advanceTimersByTimeAsync(20_000);
    odulVer({ amount: 1 });

    expect(await sonuc, 'ödül hak edildi').toBe(true);
    expect(m.hasOneGamePremium(), 'bir oyunluk premium açıldı').toBe(true);
  });

  it('reklam YÜKLENEMİYORSA zaman aşımına uğrar, oyunu bekletmez', async () => {
    vi.useFakeTimers();
    const yukleniyor = askida<void>();

    const m = await yukle({ prepareRewardVideoAd: yukleniyor });
    const sonuc = m.watchRewardedForPremium();

    await yukleniyor.cagrildi;
    await vi.advanceTimersByTimeAsync(10_000);

    expect(await sonuc, 'ödül yok').toBe(false);
    expect(m.hasOneGamePremium()).toBe(false);
  });

  it('kullanıcı reklamı yarıda kapatırsa ödül vermez', async () => {
    const kapatildi = adim<unknown>((_, reddet) => reddet(new Error('dismissed')));
    const m = await yukle({ showRewardVideoAd: kapatildi });

    expect(await m.watchRewardedForPremium()).toBe(false);
    expect(m.hasOneGamePremium()).toBe(false);
  });
});

describe('oyun sonu geçiş reklamı', () => {
  it('20 saniye açık kalan reklam oyunu kilitlemez', async () => {
    vi.useFakeTimers();
    let kapat!: (v: void) => void;
    const acik = adim<void>((cozumle) => {
      kapat = cozumle;
    });

    const m = await yukle({ showInterstitial: acik });
    const sonuc = m.showPreResultAd();

    await acik.cagrildi;
    await vi.advanceTimersByTimeAsync(20_000);
    kapat();

    await expect(sonuc).resolves.toBeUndefined();
  });
});
