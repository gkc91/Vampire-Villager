import { describe, expect, it } from 'vitest';
import { reduce } from './stateMachine';
import { buildPlayerView } from './view';
import { T0, skipToStep, startWithRoles } from './testUtils';
import type { GameState, RoleId } from './types';

/**
 * Gecede kim neyi görüyor.
 *
 * Kaynak: Bengü'nün 27 Ağustos geri bildirimi — "kâhinim, kontrol et
 * dediğim anda ekran yeni oyuncuya geçiyor, sonucu göremiyorum" ve
 * "üç vampir aynı masadaysa birbirini görmüyor".
 *
 * Dayandığı ilke: masada anlatıcı "kâhin uyansın" dediğinde kâhin ne
 * yaptığını bilir, ve aynı rolü oynayan herkes birbirini görür. Telefonla
 * oynarken bu ikisi kayboluyordu.
 */

const CAST: RoleId[] = ['vampire', 'seer', 'doctor', 'villager', 'hunter', 'villager'];
const SEER = 'p1';

function nightAt(step: Parameters<typeof skipToStep>[1], roles: RoleId[] = CAST) {
  let state = startWithRoles(roles);
  for (const p of state.players) state = reduce(state, { type: 'ROLE_SEEN', playerId: p.id }, T0);
  return skipToStep(state, step, T0);
}

const ozelSatirlar = (state: GameState, id: string) =>
  buildPlayerView(state, 'ROOM12', id)
    .log.filter((e) => e.onlyFor?.includes(id))
    .map((e) => e.key);

describe('gece — oyuncu ne yaptığını görüyor mu', () => {
  it('sonuç onay anında yazılıyor', () => {
    let state = nightAt('seer');
    expect(buildPlayerView(state, 'ROOM12', SEER).seerResults).toHaveLength(0);

    state = reduce(state, { type: 'NIGHT_ACTION', playerId: SEER, targetId: 'p0' }, T0);

    const sonuc = buildPlayerView(state, 'ROOM12', SEER).seerResults;
    expect(sonuc).toHaveLength(1);
    expect(sonuc[0].isVampire, 'p0 vampir').toBe(true);
  });

  it('kâhin okuduğunu onaylayan özel satırı alıyor', () => {
    let state = nightAt('seer');
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: SEER, targetId: 'p0' }, T0);
    expect(ozelSatirlar(state, SEER)).toContain('acted_read_self');
  });

  it('dedektif de soruşturmasını onaylayan satırı alıyor', () => {
    const kadro: RoleId[] = ['vampire', 'detective', 'doctor', 'villager', 'hunter', 'villager'];
    let state = nightAt('detective', kadro);
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p0' }, T0);
    expect(ozelSatirlar(state, 'p1')).toContain('acted_investigate_self');
  });

});

describe('gece — aynı adımı oynayanlar birbirini görüyor mu', () => {
  const IKI_VAMPIR: RoleId[] = ['vampire', 'vampire', 'seer', 'doctor', 'villager', 'villager'];
  const IKI_KAHIN: RoleId[] = ['vampire', 'seer', 'seer', 'doctor', 'villager', 'villager'];

  it('onaylanmamış dokunuş takım arkadaşına görünüyor', () => {
    let state = nightAt('vampireVote', IKI_VAMPIR);
    expect(buildPlayerView(state, 'ROOM12', 'p0').nightAction.peers).toEqual([
      { id: 'p1', name: expect.any(String), acted: false, pick: null },
    ]);

    state = reduce(state, { type: 'NIGHT_PREVIEW', playerId: 'p1', targetId: 'p2' }, T0);

    const peers = buildPlayerView(state, 'ROOM12', 'p0').nightAction.peers;
    expect(peers[0].pick, 'henüz onaylamadı ama seçimi görünüyor').toBe('p2');
    expect(peers[0].acted, 'onaylamış sayılmamalı').toBe(false);
  });

  it('onaylayınca dokunuş kesinleşmiş olarak görünüyor', () => {
    let state = nightAt('vampireVote', IKI_VAMPIR);
    state = reduce(state, { type: 'NIGHT_PREVIEW', playerId: 'p1', targetId: 'p2' }, T0);
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p2' }, T0);

    const peers = buildPlayerView(state, 'ROOM12', 'p0').nightAction.peers;
    expect(peers[0]).toMatchObject({ id: 'p1', acted: true, pick: 'p2' });
  });

  it('aynı roldeki iki kâhin birbirinin seçimini görüyor', () => {
    let state = nightAt('seer', IKI_KAHIN);
    state = reduce(state, { type: 'NIGHT_PREVIEW', playerId: 'p1', targetId: 'p0' }, T0);

    const peers = buildPlayerView(state, 'ROOM12', 'p2').nightAction.peers;
    expect(peers, 'kâhin diğer kâhini görmeli').toHaveLength(1);
    expect(peers[0]).toMatchObject({ id: 'p1', acted: false, pick: 'p0' });
  });

  it('adımı oynamayan hiç kimse bu bilgiyi görmüyor', () => {
    let state = nightAt('seer', IKI_KAHIN);
    state = reduce(state, { type: 'NIGHT_PREVIEW', playerId: 'p1', targetId: 'p0' }, T0);

    // p3 doktor: kâhin adımında oynamıyor, kimin neye baktığını bilemez.
    expect(buildPlayerView(state, 'ROOM12', 'p3').nightAction.peers).toEqual([]);
    // p0 vampir: aynı şekilde.
    expect(buildPlayerView(state, 'ROOM12', 'p0').nightAction.peers).toEqual([]);
  });

  it('onaylandıktan sonra fikir değiştirilemez', () => {
    let state = nightAt('vampireVote', IKI_VAMPIR);
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p2' }, T0);
    state = reduce(state, { type: 'NIGHT_PREVIEW', playerId: 'p1', targetId: 'p3' }, T0);

    const peers = buildPlayerView(state, 'ROOM12', 'p0').nightAction.peers;
    expect(peers[0].pick, 'onaylanan seçim korunmalı').toBe('p2');
  });

  it('önizleme oyunun sonucuna karışmıyor', () => {
    let state = nightAt('vampireVote', IKI_VAMPIR);
    const once = { ...state.night };
    state = reduce(state, { type: 'NIGHT_PREVIEW', playerId: 'p1', targetId: 'p2' }, T0);

    expect(state.night.acted, 'oynamış sayılmamalı').toEqual(once.acted);
    expect(state.night.woke, 'uyanmış sayılmamalı').toEqual(once.woke);
    expect(state.night.vampireVotes, 'oy sayılmamalı').toEqual(once.vampireVotes);
    expect(state.phase, 'adım ilerlememeli').toBe('NIGHT');
    expect(state.nightStep).toBe('vampireVote');
  });
});
