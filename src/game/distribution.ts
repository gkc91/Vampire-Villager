import type { RoleId } from './types';
import { isVampireRole } from './roles/helpers';
import { ROLE_TIER } from './unlocks';

/** 03-roles.md: minimum 4 oyuncu, üst sınır yok. */
export const MIN_PLAYERS = 4;

/** Vampir sayısı — 5–12 tablosunu birebir üreten formül. */
export function vampireCountFor(playerCount: number): number {
  return Math.floor((playerCount - 1) / 3);
}

/** Vampir tarafının açılış sırası: düz → Lord → Kan Büyücüsü → Sisler → düz… */
const VAMPIRE_ORDER: RoleId[] = ['vampire', 'vampireLord', 'bloodWizard', 'mistVampire'];

/** Köy tarafının açılış sırası; kalanlar düz köylü olur. */
const VILLAGE_ORDER: { role: RoleId; fromPlayers: number }[] = [
  { role: 'seer', fromPlayers: 0 },
  { role: 'doctor', fromPlayers: 0 },
  { role: 'hunter', fromPlayers: 6 },
  { role: 'detective', fromPlayers: 8 },
  { role: 'wizard', fromPlayers: 10 },
];

/** Hırsız bu sayıdan itibaren önerilir. */
const THIEF_FROM_PLAYERS = 9;

/** Her yerde açık olan roller — `allowed` verilmezse varsayılan budur. */
const ALL_ROLES = Object.keys(ROLE_TIER) as RoleId[];

/**
 * Kurucuya sunulan ÖNERİ. Dayatma değil: kurucu istediği rolü ekler,
 * çıkarır (03-roles.md).
 *
 * `allowed` verilirse öneri YALNIZ o rollerden kurulur. Web sürümünde rol
 * seti daha dar olduğu için bu şart: dar sete göre dengelenmezse kalabalık
 * masada herkes düz köylü olur ve oyun sıkıcılaşır.
 */
export function suggestedRoles(playerCount: number, allowed: RoleId[] = ALL_ROLES): RoleId[] {
  const can = (role: RoleId) => allowed.includes(role);
  const roles: RoleId[] = [];

  // Vampir tarafı: açık olan özel vampirler sırayla, kalanlar düz vampir.
  const vampires = Math.max(1, vampireCountFor(playerCount));
  const vampirePool = VAMPIRE_ORDER.filter(can);
  for (let i = 0; i < vampires; i++) {
    roles.push(vampirePool[i] ?? 'vampire');
  }

  if (playerCount >= THIEF_FROM_PLAYERS && can('thief')) roles.push('thief');

  const villageSlots = playerCount - roles.length;
  const specials = VILLAGE_ORDER.filter((v) => playerCount >= v.fromPlayers && can(v.role)).map(
    (v) => v.role,
  );
  for (let i = 0; i < villageSlots; i++) {
    roles.push(specials[i] ?? 'villager');
  }

  return roles;
}

export interface SetupProblem {
  /** i18n anahtarı (`lobby.setup.*`). */
  key: 'countMismatch' | 'noVampire' | 'noVillage' | 'lockedRole';
}

/**
 * Kurucunun seçtiği liste oynanabilir mi? Tek zorunlu kural: en az 1 vampir
 * ve en az 1 vampir olmayan. Dengeyi kurucu üstlenir.
 */
export function validateRoleSetup(
  roles: RoleId[],
  playerCount: number,
  allowed: RoleId[] = ALL_ROLES,
): SetupProblem | null {
  if (roles.length !== playerCount) return { key: 'countMismatch' };
  if (!roles.some(isVampireRole)) return { key: 'noVampire' };
  if (!roles.some((r) => !isVampireRole(r))) return { key: 'noVillage' };
  // Kilitli rol masaya giremez. Kontrol HOST'ta yapılır: masanın rollerini
  // kurucunun elindekiler belirler, katılanların platformu değiştirmez.
  if (roles.some((r) => !allowed.includes(r))) return { key: 'lockedRole' };
  return null;
}

export function isSupportedPlayerCount(count: number): boolean {
  return count >= MIN_PLAYERS;
}
