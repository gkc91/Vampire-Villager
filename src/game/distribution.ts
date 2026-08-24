import type { RoleId } from './types';

/** 03-roles.md — Oyuncu Sayısına Göre Dağılım tablosu (5–12). */
export const ROLE_DISTRIBUTION: Record<number, Partial<Record<RoleId, number>>> = {
  5: { vampire: 1, seer: 1, doctor: 1, hunter: 0, villager: 2 },
  6: { vampire: 1, seer: 1, doctor: 1, hunter: 1, villager: 2 },
  7: { vampire: 2, seer: 1, doctor: 1, hunter: 1, villager: 2 },
  8: { vampire: 2, seer: 1, doctor: 1, hunter: 1, villager: 3 },
  9: { vampire: 2, seer: 1, doctor: 1, hunter: 1, villager: 4 },
  10: { vampire: 3, seer: 1, doctor: 1, hunter: 1, villager: 4 },
  11: { vampire: 3, seer: 1, doctor: 1, hunter: 1, villager: 5 },
  12: { vampire: 3, seer: 1, doctor: 1, hunter: 1, villager: 6 },
};

export const MIN_PLAYERS = 5;

/** Tablonun bittiği yer; üstü formülle sürer. */
export const TABLE_MAX_PLAYERS = 12;

/**
 * Üst sınır yok. 12 üstünde tablonun kendi örüntüsü sürdürülür:
 * vampir = floor((n-1)/3) — bu formül 5–12 tablosunu birebir üretir.
 * Kâhin/Doktor/Avcı birer tanedir; kalan herkes düz köylüdür.
 */
export function vampireCountFor(playerCount: number): number {
  return Math.floor((playerCount - 1) / 3);
}

/** Odaya davet edilebilecek pratik üst sınır (P2P mesh ağırlaşır). */
export const ROOM_SIZE_OPTIONS = [8, 12, 16, 20, 24];

/** Verilen oyuncu sayısı için dağıtılacak rol listesi (karıştırılmamış). */
export function distributionFor(playerCount: number): RoleId[] {
  if (playerCount < MIN_PLAYERS) {
    throw new Error(`At least ${MIN_PLAYERS} players are required`);
  }

  const table = ROLE_DISTRIBUTION[playerCount];
  const counts: Record<RoleId, number> = table
    ? {
        vampire: table.vampire ?? 0,
        seer: table.seer ?? 0,
        doctor: table.doctor ?? 0,
        hunter: table.hunter ?? 0,
        villager: table.villager ?? 0,
      }
    : buildCounts(playerCount);

  const roles: RoleId[] = [];
  (Object.keys(counts) as RoleId[]).forEach((role) => {
    for (let i = 0; i < counts[role]; i++) roles.push(role);
  });
  return roles;
}

function buildCounts(playerCount: number): Record<RoleId, number> {
  const vampire = vampireCountFor(playerCount);
  // Özel roller birer tane; kalan herkes düz köylü.
  const specials = { seer: 1, doctor: 1, hunter: 1 };
  const villager = playerCount - vampire - specials.seer - specials.doctor - specials.hunter;
  return { vampire, ...specials, villager };
}

export function isSupportedPlayerCount(count: number): boolean {
  return count >= MIN_PLAYERS;
}
