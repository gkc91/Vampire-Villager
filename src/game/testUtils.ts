import type { GameAction, GameState, PlayerId, RoleId } from './types';
import { createInitialState, reduce } from './stateMachine';

export const T0 = 1_700_000_000_000;

/**
 * Test yardımcıları: rol dağıtımı rastgele olduğu için testlerde roller
 * START_GAME sonrası deterministik olarak sabitlenir.
 */
export function seatPlayers(count: number, seed = 42): GameState {
  let state = createInitialState(seed);
  for (let i = 0; i < count; i++) {
    state = reduce(
      state,
      {
        type: 'ADD_PLAYER',
        player: {
          id: `p${i}`,
          name: `P${i}`,
          color: '#888888',
          isHost: i === 0,
          isPlayer: true,
          connected: true,
        },
      },
      T0,
    );
  }
  return state;
}

/** Belirtilen rollerle, gece 1'e hazır bir oyun kurar (ROLE_REVEAL'da bırakır). */
export function startWithRoles(roles: RoleId[], seed = 42): GameState {
  let state = seatPlayers(roles.length, seed);
  state = reduce(state, { type: 'START_GAME' }, T0);
  state = {
    ...state,
    players: state.players.map((p, i) => ({ ...p, role: roles[i] })),
  };
  return state;
}

/** Rolleri sabitleyip herkesin rolü gördüğü, NIGHT fazındaki oyun. */
export function startNightWithRoles(roles: RoleId[], seed = 42): GameState {
  let state = startWithRoles(roles, seed);
  for (const p of state.players) {
    state = reduce(state, { type: 'ROLE_SEEN', playerId: p.id }, T0);
  }
  return state;
}

export function apply(state: GameState, actions: GameAction[], now = T0): GameState {
  return actions.reduce((s, a) => reduce(s, a, now), state);
}

export function idsWithRole(state: GameState, role: RoleId): PlayerId[] {
  return state.players.filter((p) => p.role === role).map((p) => p.id);
}

export function player(state: GameState, id: PlayerId) {
  const found = state.players.find((p) => p.id === id);
  if (!found) throw new Error(`player ${id} not found`);
  return found;
}

export function lastNarration(state: GameState): string {
  return state.log[state.log.length - 1]?.key ?? '';
}

export function narrationKeys(state: GameState): string[] {
  return state.log.map((e) => e.key);
}
