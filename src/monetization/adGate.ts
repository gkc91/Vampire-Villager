import { hasEntitlement } from './entitlements';
import { AD_UNITS } from './adUnits';
import { isNativeApp } from '../util/platform';

/**
 * Reklam kapısı — 05-monetization.md.
 *
 * İki reklam noktası var, ikisi de yalnız UYGULAMADA:
 *  1. Oyun sonu geçiş reklamı, kazanan açıklanmadan ÖNCE.
 *  2. Bir oyunluk premium açan ödüllü reklam (isteğe bağlı, oyuncu başlatır).
 *
 * Webde hiç reklam yok — kullanıcı kararı. Premium alanda da yok.
 *
 * TASARIM: SDK'yı yalnız burası tanır. Oyun motoru ve arayüz "reklam"
 * diye bir şey bilmez, yalnız `showPreResultAd()` bekler. Reklam
 * gösterilemezse (ağ yok, doluluk yok, SDK hazır değil) oyun DURMAZ:
 * her yol kısa bir gecikmeyle sonuçlanır. Reklam, oynanışı rehin
 * alamaz.
 */

/** Reklam yokken de anlatım ritmi korunsun diye kısa geçiş. */
export const PRE_RESULT_DELAY_MS = 2000;
/**
 * Reklamın YÜKLENMESİ için üst sınır. Yalnız `prepare` adımına uygulanır.
 *
 * GÖSTERİME UYGULANMAZ. Bir kez uygulanmıştı ve sonucu şuydu: kullanıcı
 * ödüllü reklamı sonuna kadar izliyor, video 8 saniyeden uzun olduğu için
 * 8. saniyede zaman aşımı fırlıyor, ödül çöpe gidiyor ve roller açılmıyordu.
 * Reklam ekranda oynamaya devam ettiğinden hata da görünmüyordu.
 *
 * İzleme süresi kullanıcının ve reklamın işi; onu biz kesemeyiz. Yükleme
 * ise ağa bağlı ve askıda kalabilir, oyunu orada tutmamak için sınırlı.
 */
const AD_TIMEOUT_MS = 8000;

type AdMobApi = typeof import('@capacitor-community/admob');

let sdk: AdMobApi | null = null;
let baslatildi = false;

/** Bir oyunluk premium: ödüllü reklam izlenince açılır, oyun bitince kapanır. */
let birOyunlukPremium = false;

export function hasOneGamePremium(): boolean {
  return birOyunlukPremium;
}

export function clearOneGamePremium(): void {
  birOyunlukPremium = false;
}

/**
 * SDK'yı bir kez hazırlar. Web'de hiçbir şey yapmaz; içe aktarma da
 * dinamik, böylece tarayıcı paketine AdMob kodu girmiyor.
 */
export async function initAds(): Promise<void> {
  if (baslatildi || !isNativeApp()) return;
  baslatildi = true;
  try {
    sdk = await import('@capacitor-community/admob');
    await attIzniIste(sdk);
    await sdk.AdMob.initialize({ initializeForTesting: false });
  } catch {
    // SDK yoksa oyun reklamsız çalışır; bu bir hata değil.
    sdk = null;
  }
}

/**
 * iOS App Tracking Transparency izni.
 *
 * iOS'ta reklam kimliğine (IDFA) erişmek için kullanıcıdan izin almak
 * zorunlu. Android ve webde eklenti bu çağrıları sessizce geçiyor, ayrıca
 * platform kontrolü gerekmiyor.
 *
 * SIRA ÖNEMLİ: izin SDK BAŞLATILMADAN önce isteniyor. Sonra istenirse
 * Google Mobile Ads kendini izinsiz varsayıp kişiselleştirilmemiş reklama
 * düşüyor ve o oturum boyunca öyle kalıyor — gelir kaybı, hata yok.
 *
 * Yalnız `notDetermined` iken soruyoruz. iOS zaten kararı bir kez alıp
 * saklıyor; tekrar sormak dialog açmıyor, ama durumu okumak niyeti de
 * kodda görünür kılıyor.
 *
 * İzin reddedilirse oyun aynen çalışır, reklamlar yalnız daha genel olur.
 * Oynanışı izne bağlamak Apple'ın açık ret sebeplerinden biri.
 */
async function attIzniIste(api: AdMobApi): Promise<void> {
  try {
    const { status } = await api.AdMob.trackingAuthorizationStatus();
    if (status === 'notDetermined') {
      await api.AdMob.requestTrackingAuthorization();
    }
  } catch {
    // Eski iOS, eksik eklenti ya da kullanıcı dialogu kapattı: reklamlar
    // kişiselleştirilmemiş devam eder. Başlatmayı engellemez.
  }
}

/**
 * Oyun sonu geçiş reklamı. Her koşulda döner — reklam gösterilemese de
 * oyun ilerler.
 */
export async function showPreResultAd(): Promise<void> {
  // hasOneGamePremium() BİLEREK yok: ödüllü reklam rol açar, reklamsızlık
  // vermez. Reklamsızlık yalnız satın almayla geliyor.
  if (!isNativeApp() || hasEntitlement('no_ads')) {
    await wait(PRE_RESULT_DELAY_MS);
    return;
  }
  await initAds();
  if (!sdk) {
    await wait(PRE_RESULT_DELAY_MS);
    return;
  }
  try {
    await withTimeout(sdk.AdMob.prepareInterstitial({ adId: AD_UNITS.interstitial }));
    // Gösterim sarmalanmaz: kullanıcı reklamı istediği kadar açık tutabilir.
    await sdk.AdMob.showInterstitial();
  } catch {
    // Doluluk yok / ağ yok / kullanıcı kapattı: sessizce geç.
    await wait(PRE_RESULT_DELAY_MS);
  }
}

/**
 * Ödüllü reklam: izlenirse bu oyunluk premium roller açılır.
 * `true` dönerse ödül hak edilmiştir.
 */
export async function watchRewardedForPremium(): Promise<boolean> {
  if (!isNativeApp()) return false;
  await initAds();
  if (!sdk) return false;
  try {
    await withTimeout(sdk.AdMob.prepareRewardVideoAd({ adId: AD_UNITS.rewarded }));
    // Gösterim sarmalanmaz: ödül ancak video bitince geliyor, 15-30 saniye.
    const odul = await sdk.AdMob.showRewardVideoAd();
    // Ödül nesnesi geldiyse kullanıcı reklamı sonuna kadar izledi.
    if (odul) {
      birOyunlukPremium = true;
      return true;
    }
  } catch {
    /* aşağıda false döner */
  }
  return false;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(p: Promise<T>): Promise<T> {
  let zamanlayici: ReturnType<typeof setTimeout>;
  const sinir = new Promise<T>((_, reject) => {
    zamanlayici = setTimeout(() => reject(new Error('ad timeout')), AD_TIMEOUT_MS);
  });
  // Kazanan hangisi olursa olsun zamanlayıcı iptal edilir; yoksa yükleme
  // erken bitse bile 8 saniyelik boş bir zamanlayıcı asılı kalıyor.
  return Promise.race([p, sinir]).finally(() => clearTimeout(zamanlayici));
}
