import type { GameAction, GameState, NightStep, PlayerId, RoleId } from './types';
import { createInitialState, reduce } from './stateMachine';
import { initialUses } from './roles';

export const T0 = 1_700_000_000_000;

/** Rol dağıtımı rastgele olduğu için testlerde roller sabitlenir. */
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

/** Belirtilen rollerle ROLE_REVEAL fazında bir oyun. */
export function startWithRoles(roles: RoleId[], seed = 42): GameState {
  let state = seatPlayers(roles.length, seed);
  state = reduce(state, { type: 'UPDATE_SETTINGS', settings: { maxPlayers: roles.length } }, T0);
  state = reduce(state, { type: 'START_GAME' }, T0);
  return {
    ...state,
    players: state.players.map((p, i) => ({
      ...p,
      role: roles[i],
      usesLeft: initialUses(roles[i]),
    })),
  };
}

/** Roller sabit, herkes rolünü gördü → gecenin ilk adımında. */
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

export function player(state: GameState, id: PlayerId) {
  const found = state.players.find((p) => p.id === id);
  if (!found) throw new Error(`player ${id} not found`);
  return found;
}

export function narrationKeys(state: GameState): string[] {
  return state.log.map((e) => e.key);
}

/** Bir oyuncuya özel gönderilen anlatımlar (gizli bildirimler). */
export function privateKeys(state: GameState, playerId: PlayerId): string[] {
  return state.log.filter((e) => e.onlyFor?.includes(playerId)).map((e) => e.key);
}

/** Belirtilen adıma gelene kadar süreyi doldurarak ilerler. */
export function skipToStep(state: GameState, step: NightStep, now = T0): GameState {
  let s = state;
  for (let i = 0; i < 12 && s.phase === 'NIGHT' && s.nightStep !== step; i++) {
    s = reduce(s, { type: 'TIMEOUT' }, now);
  }
  return s;
}

/** Geceyi sonuna kadar boş geçirir (herkes pas). */
export function skipNight(state: GameState, now = T0): GameState {
  let s = state;
  for (let i = 0; i < 12 && s.phase === 'NIGHT'; i++) {
    s = reduce(s, { type: 'TIMEOUT' }, now);
  }
  return s;
}

/** NIGHT_RESULT → DAY → (oylama) → NIGHT döngüsünü boş geçirir. */
export function quietDay(state: GameState, now = T0): GameState {
  let s = reduce(state, { type: 'TIMEOUT' }, now); // NIGHT_RESULT → DAY
  s = reduce(s, { type: 'END_DISCUSSION' }, now); // DAY → VOTE (ya da gece)
  if (s.phase === 'VOTE') {
    s = reduce(s, { type: 'TIMEOUT' }, now); // VOTE → VOTE_RESULT
    s = reduce(s, { type: 'TIMEOUT' }, now); // VOTE_RESULT → NIGHT
  }
  return s;
}
