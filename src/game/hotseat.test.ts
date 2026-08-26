import { describe, expect, it } from 'vitest';
import { reduce } from './stateMachine';
import { nextHotseatActor, TABLE_VIEWER } from './hotseat';
import { buildPlayerView } from './view';
import { T0, skipToStep, startWithRoles } from './testUtils';
import type { RoleId } from './types';

const CAST: RoleId[] = ['vampire', 'seer', 'doctor', 'villager', 'hunter', 'villager'];

describe('elden ele — telefon kimde', () => {
  it('rol dağıtımında sırayla herkese geçer', () => {
    let state = startWithRoles(CAST);
    for (const p of state.players) {
      expect(nextHotseatActor(state)).toBe(p.id);
      state = reduce(state, { type: 'ROLE_SEEN', playerId: p.id }, T0);
    }
    // Herkes gördü → gece başladı; telefon artık ilk gece oyuncusunda.
    expect(state.phase).toBe('NIGHT');
  });

  it('gecede yalnız o adımda oynayacak kişiye geçer', () => {
    let state = startWithRoles(CAST);
    for (const p of state.players) state = reduce(state, { type: 'ROLE_SEEN', playerId: p.id }, T0);
    state = skipToStep(state, 'seer', T0);

    const sira = nextHotseatActor(state);
    expect(sira, 'kâhin adımında telefon kâhinde olmalı').toBe('p1');

    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p0' }, T0);
    expect(nextHotseatActor(state)).not.toBe('p1');
  });

  it('gündüz tartışmasında sıra kimsede değil', () => {
    let state = startWithRoles(CAST);
    for (const p of state.players) state = reduce(state, { type: 'ROLE_SEEN', playerId: p.id }, T0);
    for (let i = 0; i < 12 && state.phase === 'NIGHT'; i++) {
      state = reduce(state, { type: 'TIMEOUT' }, T0);
    }
    state = reduce(state, { type: 'TIMEOUT' }, T0); // NIGHT_RESULT → DAY
    expect(state.phase).toBe('DAY_DISCUSSION');
    expect(nextHotseatActor(state)).toBeNull();
  });

  it('oylamada oy vermemiş herkese sırayla geçer', () => {
    let state = startWithRoles(CAST);
    for (const p of state.players) state = reduce(state, { type: 'ROLE_SEEN', playerId: p.id }, T0);
    for (let i = 0; i < 12 && state.phase === 'NIGHT'; i++) {
      state = reduce(state, { type: 'TIMEOUT' }, T0);
    }
    state = reduce(state, { type: 'TIMEOUT' }, T0); // NIGHT_RESULT → DAY
    state = reduce(state, { type: 'END_DISCUSSION' }, T0); // → VOTE
    expect(state.phase).toBe('VOTE');

    const ilk = nextHotseatActor(state);
    expect(ilk).not.toBeNull();
    state = reduce(state, { type: 'VOTE', playerId: ilk!, targetId: 'p0' }, T0);
    expect(nextHotseatActor(state)).not.toBe(ilk);
  });

  it('masa görünümü kimsenin rolünü ve notunu sızdırmaz', () => {
    let state = startWithRoles(CAST);
    for (const p of state.players) state = reduce(state, { type: 'ROLE_SEEN', playerId: p.id }, T0);
    state = skipToStep(state, 'seer', T0);
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p0' }, T0);

    const masa = buildPlayerView(state, 'ROOM', TABLE_VIEWER);
    expect(masa.me.role, 'masa görünümünde rol olmamalı').toBeUndefined();
    expect(masa.seerResults, 'kâhin notu masaya sızmamalı').toHaveLength(0);
    expect(masa.allRoles, 'roller oyun bitmeden açılmamalı').toBeFalsy();

    // Kâhinin kendi görünümünde not DURMALI (kıyas)
    expect(buildPlayerView(state, 'ROOM', 'p1').seerResults).toHaveLength(1);
  });
});
