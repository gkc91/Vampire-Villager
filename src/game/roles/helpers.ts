import type { GameState, Player, PlayerId, RoleId } from '../types';

export function playerById(state: GameState, id: PlayerId): Player | undefined {
  return state.players.find((p) => p.id === id);
}

/** Oyunda aktif (hayatta, terk etmemiş) oyuncular. */
export function alivePlayers(state: GameState): Player[] {
  return state.players.filter((p) => p.isPlayer && p.alive && !p.left);
}

export function aliveIds(state: GameState): PlayerId[] {
  return alivePlayers(state).map((p) => p.id);
}

export function aliveWithRole(state: GameState, role: RoleId): Player[] {
  return alivePlayers(state).filter((p) => p.role === role);
}

/** Vampir takımındaki roller. */
export const VAMPIRE_ROLES: RoleId[] = ['vampire', 'vampireLord', 'bloodWizard', 'mistVampire'];

export function isVampireRole(role: RoleId | undefined): boolean {
  return role !== undefined && VAMPIRE_ROLES.includes(role);
}

export function isVampire(player: Player | undefined): boolean {
  return isVampireRole(player?.role);
}

export function aliveVampires(state: GameState): Player[] {
  return alivePlayers(state).filter(isVampire);
}

/** Vampir olmayan hayattaki oyuncular (köy + tarafsız). */
export function aliveNonVampires(state: GameState): Player[] {
  return alivePlayers(state).filter((p) => !isVampire(p));
}

/** Hedef listesi: hayattaki herkes, isteğe bağlı olarak kendisi hariç. */
export function aliveTargets(state: GameState, excludeId?: PlayerId): PlayerId[] {
  return alivePlayers(state)
    .filter((p) => p.id !== excludeId)
    .map((p) => p.id);
}
