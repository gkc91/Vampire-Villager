/**
 * 05-monetization.md — TEK KAPI.
 * MVP'de her şey herkese açık; gerçek kontrol ileride buraya girer.
 * Kodun geri kalanı bu fonksiyon dışında hiçbir yerde satın alma bilmez.
 */
export type Entitlement = 'premium_roles' | 'big_room' | 'no_ads';

export function hasEntitlement(_e: Entitlement): boolean {
  return true; // MVP: pasif yer tutucu.
}
