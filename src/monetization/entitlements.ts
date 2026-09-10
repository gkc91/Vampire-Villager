import type { RoleId } from '../game/types';
import { unlockedRoles } from '../game/unlocks';
import { isNativeApp } from '../util/platform';
import { hasPremium } from './billing';
import { hasOneGamePremium } from './adGate';

/**
 * 05-monetization.md — TEK KAPI.
 * Kodun geri kalanı bu dosya dışında hiçbir yerde satın alma bilmez.
 */
export type Entitlement = 'premium_roles' | 'big_room' | 'no_ads';

/**
 * Rol katmanları ne zaman devreye girsin?
 *
 * `false` iken herkes her rolü görür — bugünkü davranış. Uygulama mağazaya
 * çıkana kadar böyle kalmalı: aksi halde webde oynayan arkadaşlar, daha
 * indirebilecekleri bir uygulama yokken rollerini kaybeder. Mağaza yayına
 * girdiği gün bu satır `true` yapılır, başka hiçbir yere dokunulmaz.
 */
const ROLE_TIERS_ACTIVE = false;

export function hasEntitlement(entitlement: Entitlement): boolean {
  // Reklam kapısı rol katmanlarından BAĞIMSIZ değerlendirilir.
  //
  // ROLE_TIERS_ACTIVE kapalıyken üstteki erken dönüş buraya da uygulanıyordu
  // ve herkes "reklamsız" sayılıyordu: reklamlar hiç görünmezdi. İki ayrı
  // konu tek anahtara bağlanmıştı.
  //
  // Kapsam kuralı (kullanıcı kararı, 10 Eylül 2026): reklamsızlık CİHAZ
  // BAŞINA. Premium alan kişi masayı kursa bile diğer oyuncular oyun sonu
  // reklamını görür — herkes kendi hakkına bakar. Rollerde kural tersi:
  // orada kurucunun hakkı bütün masaya geçer.
  if (entitlement === 'no_ads') {
    // Webde zaten hiç reklam göstermiyoruz, orada herkes reklamsız.
    // Uygulamada ise yalnız satın alan: ödüllü reklam izleyen kişi bunu
    // kazanmaz, reklamı zaten kabul etmiş demektir ve para ödememiştir.
    return !isNativeApp() || hasPremium();
  }

  if (!ROLE_TIERS_ACTIVE) return true;
  if (entitlement === 'premium_roles') {
    // Premium yalnız uygulamada; webde her zaman kapalı.
    // İki yol da kabul: satın alma (kalıcı) veya ödüllü reklam (bir oyunluk).
    return isNativeApp() && (hasPremium() || hasOneGamePremium());
  }
  return true;
}

/**
 * Bu cihazda masaya konabilecek roller. Host-otoriter: masanın rollerini
 * KURUCUNUN eli belirler, webden katılan oyuncu da onlarla oynar.
 */
export function currentUnlockedRoles(): RoleId[] {
  if (!ROLE_TIERS_ACTIVE) return unlockedRoles({ native: true, premium: true });
  return unlockedRoles({ native: isNativeApp(), premium: hasEntitlement('premium_roles') });
}
