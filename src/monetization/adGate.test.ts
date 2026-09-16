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

/** Çağrı sırasını kaydeder — ATT'nin initialize'dan ÖNCE gelmesi şart. */
let izlek: string[] = [];

async function yukle(sdk: {
  prepareRewardVideoAd?: SahteAdim<void>;
  showRewardVideoAd?: SahteAdim<unknown>;
  prepareInterstitial?: SahteAdim<void>;
  showInterstitial?: SahteAdim<void>;
  attDurumu?: 'authorized' | 'denied' | 'notDetermined' | 'restricted';
  attHata?: boolean;
}) {
  vi.resetModules();
  izlek = [];
  vi.doMock('../util/platform', () => ({ isNativeApp: () => true }));
  vi.doMock('@capacitor-community/admob', () => ({
    AdMob: {
      trackingAuthorizationStatus: async () => {
        if (sdk.attHata) throw new Error('eski iOS');
        izlek.push('durum');
        return { status: sdk.attDurumu ?? 'notDetermined' };
      },
      requestTrackingAuthorization: async () => {
        izlek.push('izin-iste');
      },
      initialize: async () => {
        izlek.push('initialize');
      },
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

describe('iOS izleme izni (ATT)', () => {
  /**
   * iOS'ta IDFA'ya erişmek için izin şart. Sıra da şart: izin SDK
   * başlatılmadan ÖNCE istenmeli, yoksa Google Mobile Ads kendini izinsiz
   * varsayıp o oturum boyunca kişiselleştirilmemiş reklama düşüyor —
   * sessiz gelir kaybı.
   */
  it('izin, SDK başlatılmadan ÖNCE isteniyor', async () => {
    const m = await yukle({ attDurumu: 'notDetermined' });
    await m.initAds();

    expect(izlek).toEqual(['durum', 'izin-iste', 'initialize']);
  });

  it('karar verilmişse tekrar sorulmuyor', async () => {
    const m = await yukle({ attDurumu: 'denied' });
    await m.initAds();

    expect(izlek).toEqual(['durum', 'initialize']);
  });

  it('izin katmanı patlasa da SDK başlıyor', async () => {
    // Eski iOS ya da eksik eklenti: reklamlar kişiselleştirilmemiş devam
    // eder, ama reklam katmanı tamamen ölmemeli.
    const m = await yukle({ attHata: true });
    await m.initAds();

    expect(izlek).toEqual(['initialize']);
  });
});
