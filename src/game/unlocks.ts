import type { RoleId } from './types';

/**
 * Rollerin dağıtım katmanları (kullanıcı kararı, 2026-08-26).
 *
 * - `core`   → her yerde açık. Web sürümü tam olarak bu dört rolle
 *              oynanır: köylü, vampir, kâhin, doktor. Oyunun kuralını
 *              anlatmaya yeten en küçük kadro.
 * - `app`    → mağazadan indirilen uygulamada ücretsiz. Dört ekstra rol,
 *              indirmenin karşılığı.
 * - `premium`→ tek seferlik satın alma (ya da bir oyunluk ödüllü reklam).
 *              Üçü de oyunun dengesini değiştiren "egzotik" roller —
 *              parasını ödeyene yeni bir oyun hissi versin diye.
 *
 * Kilitli roller gizlenmez: adıyla ve kilit simgesiyle görünür, merak
 * uyandırması işin bir parçası.
 *
 * DİKKAT: burası yalnız İÇERİK sınıflandırmasıdır. Satın alma bilgisi
 * `entitlements.ts`'te, platform bilgisi `platform.ts`'te durur; oyun
 * motoru ikisini de bilmez, yalnız "izin verilen roller" listesi alır.
 */
export type RoleTier = 'core' | 'app' | 'premium';

export const ROLE_TIER: Record<RoleId, RoleTier> = {
  // Çekirdek — webde de oynanır (4)
  villager: 'core',
  vampire: 'core',
  seer: 'core',
  doctor: 'core',
  // Uygulamada ücretsiz (4)
  vampireLord: 'app',
  hunter: 'app',
  thief: 'app',
  detective: 'app',
  // Premium (3)
  wizard: 'premium',
  bloodWizard: 'premium',
  mistVampire: 'premium',
};

/** Hangi katmanların açık olduğuna göre oynanabilir rol listesi. */
export function rolesForTiers(tiers: RoleTier[]): RoleId[] {
  return (Object.keys(ROLE_TIER) as RoleId[]).filter((id) => tiers.includes(ROLE_TIER[id]));
}

/**
 * Kurucunun elindeki roller masanın rollerini belirler (host-otoriter).
 * Webden katılan bir oyuncu, premium bir kurucunun masasında premium
 * rollerle oynar — tek kişinin satın alması sofranın tamamına yeter.
 */
export function unlockedRoles(opts: { native: boolean; premium: boolean }): RoleId[] {
  const tiers: RoleTier[] = ['core'];
  if (opts.native) tiers.push('app');
  if (opts.premium) tiers.push('premium');
  return rolesForTiers(tiers);
}
