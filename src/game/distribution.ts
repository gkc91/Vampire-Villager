import type { RoleId } from './types';
import { isVampireRole } from './roles/helpers';

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

/**
 * Kurucuya sunulan ÖNERİ. Dayatma değil: kurucu istediği rolü ekler,
 * çıkarır (03-roles.md).
 */
export function suggestedRoles(playerCount: number): RoleId[] {
  const roles: RoleId[] = [];

  const vampires = Math.max(1, vampireCountFor(playerCount));
  for (let i = 0; i < vampires; i++) {
    roles.push(VAMPIRE_ORDER[i] ?? 'vampire');
  }

  const neutral = playerCount >= THIEF_FROM_PLAYERS ? 1 : 0;
  if (neutral) roles.push('thief');

  const villageSlots = playerCount - roles.length;
  const specials = VILLAGE_ORDER.filter((v) => playerCount >= v.fromPlayers).map((v) => v.role);
  for (let i = 0; i < villageSlots; i++) {
    roles.push(specials[i] ?? 'villager');
  }

  return roles;
}

export interface SetupProblem {
  /** i18n anahtarı (`lobby.setup.*`). */
  key: 'countMismatch' | 'noVampire' | 'noVillage';
}

/**
 * Kurucunun seçtiği liste oynanabilir mi? Tek zorunlu kural: en az 1 vampir
 * ve en az 1 vampir olmayan. Dengeyi kurucu üstlenir.
 */
export function validateRoleSetup(roles: RoleId[], playerCount: number): SetupProblem | null {
  if (roles.length !== playerCount) return { key: 'countMismatch' };
  if (!roles.some(isVampireRole)) return { key: 'noVampire' };
  if (!roles.some((r) => !isVampireRole(r))) return { key: 'noVillage' };
  return null;
}

export function isSupportedPlayerCount(count: number): boolean {
  return count >= MIN_PLAYERS;
}
