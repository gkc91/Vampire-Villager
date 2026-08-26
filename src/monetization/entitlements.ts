import type { RoleId } from '../game/types';
import { unlockedRoles } from '../game/unlocks';
import { isNativeApp } from '../util/platform';

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
  if (!ROLE_TIERS_ACTIVE) return true;
  // İleride: Play Billing / StoreKit satın alma durumu.
  // Premium yalnız uygulamada satın alınabilir; webde her zaman kapalı.
  if (entitlement === 'premium_roles') return isNativeApp() && false;
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
