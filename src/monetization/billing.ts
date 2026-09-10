import { isNativeApp } from '../util/platform';

/**
 * Google Play satın alma — TEK KAPI.
 *
 * Ürün tek: `premium_roles`. Tek seferlik, tüketilmeyen (non-consumable)
 * bir ürün; bir kez alınır, cihazda ömür boyu durur.
 *
 * NEDEN RevenueCat DEĞİL: RevenueCat'in çözdüğü şey abonelik yönetimi,
 * sunucu tarafı makbuz doğrulama ve platformlar arası eşleme. Bizde
 * abonelik yok, tek ürün var, tek platform var. Buna karşılık araya
 * üçüncü taraf bir sunucu ve $2.500/ay üstünde %1 kesinti giriyor.
 * Projenin birinci prensibi sıfır geliştirici maliyeti; doğrudan Play
 * Billing bunu bozmuyor.
 *
 * DOĞRULAMA HAKKINDA DÜRÜST NOT: sunucu tarafı makbuz doğrulaması yok,
 * satın alma durumunu cihazdan okuyoruz. Bilinçli bir tercih: burada
 * "hile" ancak kendi masana üç ekstra rol açmak anlamına geliyor,
 * sunucuda korunan bir değer yok. Backend eklemek bu riski karşılamaz.
 */

export const PREMIUM_PRODUCT_ID = 'premium_roles';

/** Mağaza sorgusu bir kez yapılır, sonucu burada durur. */
let sahipMi = false;
let sorgulandi = false;

type BillingApi = typeof import('@capgo/native-purchases');

async function sdk(): Promise<BillingApi | null> {
  if (!isNativeApp()) return null;
  try {
    return await import('@capgo/native-purchases');
  } catch {
    return null;
  }
}

/**
 * Uygulama açılışında mağazaya "bu kullanıcı almış mı" diye sorar.
 * Cihaz değiştiren ya da uygulamayı silip kuran kişi hakkını kaybetmesin.
 */
export async function restorePremium(): Promise<boolean> {
  if (sorgulandi) return sahipMi;
  sorgulandi = true;

  const api = await sdk();
  if (!api) return false;
  try {
    const { isBillingSupported } = await api.NativePurchases.isBillingSupported();
    if (!isBillingSupported) return false;

    const { purchases } = await api.NativePurchases.getPurchases({
      productType: api.PURCHASE_TYPE.INAPP,
    });
    sahipMi = purchases.some((p) => p.productIdentifier === PREMIUM_PRODUCT_ID);
  } catch {
    // Ağ yok / Play Store yok: hak yokmuş gibi davran, oyun çalışmaya devam.
    sahipMi = false;
  }
  return sahipMi;
}

/** Satın alma akışını açar. `true` dönerse hak kazanılmıştır. */
export async function buyPremium(): Promise<boolean> {
  const api = await sdk();
  if (!api) return false;
  try {
    const islem = await api.NativePurchases.purchaseProduct({
      productIdentifier: PREMIUM_PRODUCT_ID,
      productType: api.PURCHASE_TYPE.INAPP,
      // Otomatik onay açık kalsın: Android'de 3 gün içinde onaylanmayan
      // satın alma Google tarafından iade ediliyor.
    });
    if (islem?.productIdentifier === PREMIUM_PRODUCT_ID) {
      sahipMi = true;
      return true;
    }
  } catch {
    // Kullanıcı vazgeçti, ödeme reddedildi ya da mağaza ulaşılamadı.
  }
  return false;
}

/** Bu cihazda premium hakkı var mı (mağaza sorgusunun sonucu). */
export function hasPremium(): boolean {
  return sahipMi;
}
