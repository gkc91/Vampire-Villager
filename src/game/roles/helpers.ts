import type { GameState, Player, PlayerId, RoleId } from '../types';

export function playerById(state: GameState, id: PlayerId): Player | undefined {
  return state.players.find((p) => p.id === id);
}

/** Oyunda aktif (hayatta, terk etmemiş, oyuncu olan) herkes. */
export function alivePlayers(state: GameState): Player[] {
  return state.players.filter((p) => p.isPlayer && p.alive && !p.left);
}

export function aliveIds(state: GameState): PlayerId[] {
  return alivePlayers(state).map((p) => p.id);
}

export function aliveWithRole(state: GameState, role: RoleId): Player[] {
  return alivePlayers(state).filter((p) => p.role === role);
}

export function isVampire(player: Player | undefined): boolean {
  return player?.role === 'vampire';
}
