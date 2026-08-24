import { describe, expect, it } from 'vitest';
import { buildPlayerView } from './view';
import { reduce } from './stateMachine';
import { T0, apply, startNightWithRoles, startWithRoles } from './testUtils';
import type { RoleId } from './types';

const SIX: RoleId[] = ['vampire', 'seer', 'doctor', 'hunter', 'villager', 'villager'];
const TWO_VAMPS: RoleId[] = ['vampire', 'vampire', 'seer', 'doctor', 'hunter', 'villager', 'villager'];

describe('görünüm filtresi (host-otoriter gizlilik)', () => {
  it('oyuncu yalnız kendi rolünü görür', () => {
    const state = startWithRoles(SIX);
    const view = buildPlayerView(state, 'ROOM', 'p4');
    expect(view.me.role).toBe('villager');
    expect(view.players.every((p) => p.role === undefined)).toBe(true);
    expect(view.allRoles).toBeNull();
  });

  it('vampirler birbirini görür, köylüler görmez', () => {
    const state = startWithRoles(TWO_VAMPS);
    const vampView = buildPlayerView(state, 'ROOM', 'p0');
    expect(vampView.teammates).toEqual(['p1']);

    const villagerView = buildPlayerView(state, 'ROOM', 'p5');
    expect(villagerView.teammates).toEqual([]);
  });

  it('kâhin sonuçları yalnız kâhine gider', () => {
    let state = startNightWithRoles(SIX);
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p0' }, T0);
    expect(buildPlayerView(state, 'ROOM', 'p1').seerResults).toHaveLength(1);
    expect(buildPlayerView(state, 'ROOM', 'p2').seerResults).toHaveLength(0);
    expect(buildPlayerView(state, 'ROOM', 'p0').seerResults).toHaveLength(0);
  });

  it('vampir seçimleri yalnız vampirlere gider', () => {
    let state = startNightWithRoles(TWO_VAMPS);
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p5' }, T0);
    expect(buildPlayerView(state, 'ROOM', 'p1').vampirePicks).toEqual({ p0: 'p5' });
    expect(buildPlayerView(state, 'ROOM', 'p2').vampirePicks).toEqual({});
  });

  it('ne gece ölümünde ne de asılmada rol açıklanır', () => {
    let state = startNightWithRoles(SIX);
    state = apply(state, [
      { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p4' },
      { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p5' },
      { type: 'NIGHT_ACTION', playerId: 'p2', targetId: 'p2' },
    ]);
    const alive = buildPlayerView(state, 'ROOM', 'p5');
    expect(alive.players.find((p) => p.id === 'p4')?.role).toBeUndefined();

    state = apply(state, [{ type: 'TIMEOUT' }, { type: 'END_DISCUSSION' }]);
    state = apply(state, [
      { type: 'VOTE', playerId: 'p0', targetId: 'p3' },
      { type: 'VOTE', playerId: 'p1', targetId: 'p3' },
      { type: 'VOTE', playerId: 'p2', targetId: 'p3' },
      { type: 'VOTE', playerId: 'p3', targetId: 'abstain' },
      { type: 'VOTE', playerId: 'p5', targetId: 'abstain' },
    ]);
    // p3 avcı → HUNTER_SHOT, pas geç
    state = reduce(state, { type: 'HUNTER_SHOT', playerId: 'p3', targetId: null }, T0);
    const afterHang = buildPlayerView(state, 'ROOM', 'p5');
    expect(afterHang.players.find((p) => p.id === 'p3')?.role).toBeUndefined();
    expect(afterHang.allRoles).toBeNull();
    // Anlatımda da rol geçmez
    expect(state.log.find((e) => e.key === 'vote_hanged')?.params?.roleKey).toBeUndefined();
  });

  it('ölü oyuncu hayalet modunda tüm rolleri görür', () => {
    let state = startNightWithRoles(SIX);
    state = apply(state, [
      { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p4' },
      { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p5' },
      { type: 'NIGHT_ACTION', playerId: 'p2', targetId: 'p2' },
    ]);
    const ghost = buildPlayerView(state, 'ROOM', 'p4');
    expect(ghost.me.ghost).toBe(true);
    expect(ghost.allRoles).not.toBeNull();
    expect(Object.keys(ghost.allRoles!)).toHaveLength(6);
  });

  it('oylama sırasında hedefler gizli, sonuçta açık', () => {
    let state = startNightWithRoles(SIX);
    state = apply(state, [{ type: 'TIMEOUT' }, { type: 'TIMEOUT' }, { type: 'END_DISCUSSION' }]);
    state = reduce(state, { type: 'VOTE', playerId: 'p0', targetId: 'p4' }, T0);
    const during = buildPlayerView(state, 'ROOM', 'p5');
    expect(during.vote.tally).toBeNull();
    expect(during.players.find((p) => p.id === 'p0')?.hasVoted).toBe(true);

    state = reduce(state, { type: 'TIMEOUT' }, T0 + 45_000);
    const after = buildPlayerView(state, 'ROOM', 'p5');
    expect(after.vote.tally).toEqual({ p4: 1 });
  });

  it('oyun sonunda herkesin ekranında tüm roller açılır', () => {
    let state = startNightWithRoles(SIX);
    state = reduce(state, { type: 'PLAYER_LEFT', playerId: 'p0' }, T0);
    expect(state.phase).toBe('GAME_END');

    for (const viewer of ['p1', 'p2', 'p3', 'p4', 'p5']) {
      const view = buildPlayerView(state, 'ROOM', viewer);
      expect(view.allRoles).not.toBeNull();
      expect(Object.keys(view.allRoles!)).toHaveLength(6);
      expect(view.players.find((p) => p.id === 'p0')?.role).toBe('vampire');
    }
  });

  it('gece görünümü yalnız geçerli hedefleri taşır', () => {
    const state = startNightWithRoles(SIX);
    const vamp = buildPlayerView(state, 'ROOM', 'p0');
    expect(vamp.nightAction.canAct).toBe(true);
    // Vampir kendini de hedefleyebilir (kullanıcı kararı)
    expect(vamp.nightAction.validTargets).toContain('p0');

    const villager = buildPlayerView(state, 'ROOM', 'p4');
    expect(villager.nightAction.canAct).toBe(false);
    expect(villager.nightAction.validTargets).toEqual([]);
  });
});
