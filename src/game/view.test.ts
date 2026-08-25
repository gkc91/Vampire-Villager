import { describe, expect, it } from 'vitest';
import { buildPlayerView } from './view';
import { reduce } from './stateMachine';
import { T0, skipNight, skipToStep, startNightWithRoles, startWithRoles } from './testUtils';
import type { RoleId } from './types';

const SIX: RoleId[] = ['vampire', 'seer', 'doctor', 'detective', 'villager', 'villager'];
const TEAM: RoleId[] = ['vampireLord', 'bloodWizard', 'seer', 'doctor', 'villager', 'villager'];

describe('görünüm filtresi (host-otoriter gizlilik)', () => {
  it('oyuncu yalnız kendi rolünü görür', () => {
    const state = startWithRoles(SIX);
    const view = buildPlayerView(state, 'ROOM', 'p4');
    expect(view.me.role).toBe('villager');
    expect(view.players.every((p) => p.role === undefined)).toBe(true);
    expect(view.allRoles).toBeNull();
  });

  it('vampir takımı birbirini görür, köylüler görmez', () => {
    const state = startWithRoles(TEAM);
    const lord = buildPlayerView(state, 'ROOM', 'p0');
    expect(lord.teammates).toEqual(['p1']);

    const villager = buildPlayerView(state, 'ROOM', 'p4');
    expect(villager.teammates).toEqual([]);
  });

  it('kâhin ve dedektif sonuçları yalnız sahibine gider', () => {
    let state = startNightWithRoles(SIX);
    state = skipToStep(state, 'seer');
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p0' }, T0);
    state = skipToStep(state, 'detective');
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p3', targetId: 'p0' }, T0);

    expect(buildPlayerView(state, 'ROOM', 'p1').seerResults).toHaveLength(1);
    expect(buildPlayerView(state, 'ROOM', 'p3').seerResults).toHaveLength(0);
    expect(buildPlayerView(state, 'ROOM', 'p3').detectiveResults).toHaveLength(1);
    expect(buildPlayerView(state, 'ROOM', 'p1').detectiveResults).toHaveLength(0);
  });

  it('gizli bildirimler yalnız ilgili oyuncunun anlatımında görünür', () => {
    const roles: RoleId[] = ['vampireLord', 'vampire', 'seer', 'doctor', 'villager', 'villager'];
    let state = startNightWithRoles(roles);
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p4' }, T0);

    const converted = buildPlayerView(state, 'ROOM', 'p4').log.map((e) => e.key);
    const other = buildPlayerView(state, 'ROOM', 'p2').log.map((e) => e.key);
    expect(converted).toContain('converted_self');
    expect(other).not.toContain('converted_self');
  });

  it('yalnız sırası gelen oyuncu aksiyon alabilir', () => {
    const state = startNightWithRoles(SIX);
    expect(state.nightStep).toBe('vampireVote');
    expect(buildPlayerView(state, 'ROOM', 'p0').nightAction.canAct).toBe(true);
    expect(buildPlayerView(state, 'ROOM', 'p1').nightAction.canAct).toBe(false);
    expect(buildPlayerView(state, 'ROOM', 'p1').nightAction.validTargets).toEqual([]);
  });

  it('özel vampir kendi adımından sonra oylamada da seçim yapabilir', () => {
    const roles: RoleId[] = ['vampireLord', 'vampire', 'seer', 'doctor', 'villager', 'villager'];
    let state = startNightWithRoles(roles);

    // Lord kendi adımında oynar
    expect(buildPlayerView(state, 'ROOM', 'p0').nightAction.canAct).toBe(true);
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p4' }, T0);
    state = skipToStep(state, 'vampireVote');

    const lordView = buildPlayerView(state, 'ROOM', 'p0');
    expect(lordView.nightAction.canAct).toBe(true);
    // Oylamada hedef listesi vampir rolününki: herkes seçilebilir
    expect(lordView.nightAction.validTargets.length).toBeGreaterThan(0);
  });

  it('kâhin sonucunu seçim yaptığı anda alır', () => {
    let state = startNightWithRoles(SIX);
    state = skipToStep(state, 'seer');
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p0' }, T0);

    const view = buildPlayerView(state, 'ROOM', 'p1');
    expect(view.seerResults).toHaveLength(1);
    expect(view.seerResults[0]).toMatchObject({ targetId: 'p0', isVampire: true });
  });

  it('roller oyun bitene kadar kapalı, bitince herkese açılır', () => {
    let state = startNightWithRoles(SIX);
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p4' }, T0);
    state = skipNight(state);

    const alive = buildPlayerView(state, 'ROOM', 'p5');
    expect(alive.players.find((p) => p.id === 'p4')?.role).toBeUndefined();
    expect(alive.allRoles).toBeNull();

    state = reduce(state, { type: 'PLAYER_LEFT', playerId: 'p0' }, T0);
    expect(state.phase).toBe('GAME_END');
    for (const viewer of ['p1', 'p2', 'p3', 'p5']) {
      const view = buildPlayerView(state, 'ROOM', viewer);
      expect(view.allRoles).not.toBeNull();
      expect(view.players.find((p) => p.id === 'p0')?.role).toBe('vampire');
    }
  });

  it('ölü oyuncu hayalet modunda tüm rolleri görür', () => {
    let state = startNightWithRoles(SIX);
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p4' }, T0);
    state = skipNight(state);

    const ghost = buildPlayerView(state, 'ROOM', 'p4');
    expect(ghost.me.ghost).toBe(true);
    expect(ghost.allRoles).not.toBeNull();
    expect(Object.keys(ghost.allRoles!)).toHaveLength(6);
  });

  it('kalan hak görünümde taşınır', () => {
    const state = startNightWithRoles(SIX);
    expect(buildPlayerView(state, 'ROOM', 'p2').me.usesLeft).toBe(2); // doktor
    expect(buildPlayerView(state, 'ROOM', 'p1').me.usesLeft).toBeNull(); // kâhin sınırsız
  });

  it('oylama sırasında hedefler gizli, sonuçta açık', () => {
    let state = startNightWithRoles(SIX);
    state = skipNight(state);
    state = reduce(state, { type: 'TIMEOUT' }, T0);
    state = reduce(state, { type: 'END_DISCUSSION' }, T0);
    state = reduce(state, { type: 'VOTE', playerId: 'p0', targetId: 'p4' }, T0);

    const during = buildPlayerView(state, 'ROOM', 'p5');
    expect(during.vote.tally).toBeNull();
    expect(during.players.find((p) => p.id === 'p0')?.hasVoted).toBe(true);

    state = reduce(state, { type: 'TIMEOUT' }, T0 + 45_000);
    expect(buildPlayerView(state, 'ROOM', 'p5').vote.tally).toEqual({ p4: 1 });
  });

  it('büyü yapıldığı herkese görünür ama kimin yaptığı gizli', () => {
    const roles: RoleId[] = ['vampire', 'wizard', 'seer', 'doctor', 'villager', 'villager'];
    let state = startNightWithRoles(roles);
    state = skipNight(state);
    state = reduce(state, { type: 'TIMEOUT' }, T0);
    state = reduce(state, { type: 'CAST_SPELL', playerId: 'p1', targetId: 'p2' }, T0);

    const other = buildPlayerView(state, 'ROOM', 'p4');
    expect(other.spell.castToday).toBe(true);
    expect(other.log.map((e) => e.key)).toContain('spell_cast');
    // Büyücünün kimliği sızmaz
    expect(other.players.find((p) => p.id === 'p1')?.role).toBeUndefined();
  });
});
