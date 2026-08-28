import { describe, expect, it } from 'vitest';
import { reduce } from './stateMachine';
import { nextHotseatActor } from './hotseat';
import { buildPlayerView } from './view';
import { T0, skipToStep, startWithRoles } from './testUtils';
import type { RoleId } from './types';

/**
 * Bengü'nün 27 Ağustos geri bildirimi: "kâhinim, kontrol et dediğim anda
 * ekran yeni oyuncuya geçiyor, sonucu göremiyorum."
 *
 * Bu dosya iddiayı motorda ölçüyor. Düzeltmeden ÖNCE yazıldı: amacı
 * hatanın nerede olduğunu (ve nerede OLMADIĞINI) kanıta bağlamak.
 */

const CAST: RoleId[] = ['vampire', 'seer', 'doctor', 'villager', 'hunter', 'villager'];
const SEER = 'p1';

function nightAtSeerStep() {
  let state = startWithRoles(CAST);
  for (const p of state.players) state = reduce(state, { type: 'ROLE_SEEN', playerId: p.id }, T0);
  return skipToStep(state, 'seer', T0);
}

describe('geri bildirim — kâhin sonucunu ne zaman görüyor', () => {
  it('sonuç ONAY ANINDA hesaplanıyor: veri kaybı yok', () => {
    let state = nightAtSeerStep();
    expect(buildPlayerView(state, 'ROOM12', SEER).seerResults).toHaveLength(0);

    state = reduce(state, { type: 'NIGHT_ACTION', playerId: SEER, targetId: 'p0' }, T0);

    const sonuc = buildPlayerView(state, 'ROOM12', SEER).seerResults;
    expect(sonuc, 'okuma anında yazılmalı').toHaveLength(1);
    expect(sonuc[0].isVampire, 'p0 vampir').toBe(true);
  });

  it('ELDEN ELE: sonuç yazıldığı anda telefon başkasına geçiyor', () => {
    let state = nightAtSeerStep();
    expect(nextHotseatActor(state)).toBe(SEER);

    state = reduce(state, { type: 'NIGHT_ACTION', playerId: SEER, targetId: 'p0' }, T0);

    // Sonuç var...
    expect(buildPlayerView(state, 'ROOM12', SEER).seerResults).toHaveLength(1);
    // ...ama sıra artık kâhinde değil: o sonucu KİMSE ona göstermiyor.
    expect(nextHotseatActor(state)).not.toBe(SEER);
  });

  it('kâhine ÖZEL onay satırı gitmiyor, doktora gidiyor', () => {
    // Sayı değil, satırın kendisi önemli: kâhin gece ilerlediği için gelen
    // GENEL anlatımı (no_death) alıyor, kendisine ÖZEL bir onay değil.
    const ozelSatirlar = (state: ReturnType<typeof startWithRoles>, id: string) =>
      buildPlayerView(state, 'ROOM12', id).log.filter((e) => e.onlyFor?.includes(id));

    let k = nightAtSeerStep();
    k = reduce(k, { type: 'NIGHT_ACTION', playerId: SEER, targetId: 'p0' }, T0);

    // Doktor adımı kâhinden ÖNCE (NIGHT_ORDER), o yüzden taze geceden atla.
    let d = startWithRoles(CAST);
    for (const p of d.players) d = reduce(d, { type: 'ROLE_SEEN', playerId: p.id }, T0);
    d = skipToStep(d, 'doctor', T0);
    d = reduce(d, { type: 'NIGHT_ACTION', playerId: 'p2', targetId: 'p3' }, T0);

    expect(ozelSatirlar(d, 'p2').map((e) => e.key)).toContain('acted_protect_self');
    expect(ozelSatirlar(k, SEER), 'kâhine özel onay satırı yok').toHaveLength(0);
  });
});

describe('geri bildirim — seçim onaydan önce takıma görünüyor mu', () => {
  it('vampir seçimi yalnız ONAYDAN SONRA takıma görünüyor', () => {
    // İki vampirli masa: biri seçsin, diğeri görebiliyor mu?
    const iki: RoleId[] = ['vampire', 'vampire', 'seer', 'doctor', 'villager', 'villager'];
    let state = startWithRoles(iki);
    for (const p of state.players) state = reduce(state, { type: 'ROLE_SEEN', playerId: p.id }, T0);
    state = skipToStep(state, 'vampireVote', T0);

    // p1 henüz onaylamadı → p0 hiçbir şey görmüyor.
    expect(Object.keys(buildPlayerView(state, 'ROOM12', 'p0').vampirePicks)).toHaveLength(0);

    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p2' }, T0);

    // Onaydan sonra görünüyor. Aradaki "seçtim ama onaylamadım" anında
    // takım arkadaşının hiçbir bilgisi yok — istenen bu değil.
    expect(buildPlayerView(state, 'ROOM12', 'p0').vampirePicks).toEqual({ p1: 'p2' });
  });

  it('aynı roldeki iki kâhin birbirinin seçimini HİÇ görmüyor', () => {
    const ikiKahin: RoleId[] = ['vampire', 'seer', 'seer', 'doctor', 'villager', 'villager'];
    let state = startWithRoles(ikiKahin);
    for (const p of state.players) state = reduce(state, { type: 'ROLE_SEEN', playerId: p.id }, T0);
    state = skipToStep(state, 'seer', T0);

    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p0' }, T0);

    // p2 de kâhin ama p1'in ne yaptığına dair hiçbir şey görmüyor:
    // vampirePicks yalnız knowsTeammates olan rollere açık.
    expect(buildPlayerView(state, 'ROOM12', 'p2').vampirePicks).toEqual({});
    expect(buildPlayerView(state, 'ROOM12', 'p2').seerResults).toHaveLength(0);
  });
});
