import { describe, expect, it } from 'vitest';
import { nextLocalActor } from './localSeats';
import { reduce } from './stateMachine';
import { startNightWithRoles, startWithRoles, T0 } from './testUtils';
import type { GameState, PlayerId } from './types';

/**
 * "Telefon şimdi kimde olmalı?" (08-yerel-oyuncular.md)
 *
 * NEDEN TEST VAR: bu fonksiyon kurucunun ekranında PERDENİN ne zaman
 * açılacağına karar veriyor. Yanlış kişiyi döndürürse kurucu başkasının
 * rolünü görür — oyunun bittiği yer tam burasıdır. Yanlış zamanda `null`
 * döndürürse sıra kimseye gelmez ve oyun kilitlenir.
 *
 * En kritik özellik: UZAKTAKİ oyuncular bu sıraya hiç girmemeli. Onlar
 * kendi telefonlarında oynuyor; kurucunun ekranında belirmeleri hem
 * gereksiz bekleme hem sızıntı olurdu.
 */

/** Verilen oyuncuları kurucunun telefonuna taşır. */
function yerelYap(state: GameState, ...ids: PlayerId[]): GameState {
  return { ...state, players: state.players.map((p) => (ids.includes(p.id) ? { ...p, isLocal: true } : p)) };
}

const ROLLER = ['vampire', 'villager', 'seer', 'villager'] as const;

describe('yerel oyuncu yokken', () => {
  it('her fazda null — kurucu kendi ekranına bakar', () => {
    const rol = startWithRoles([...ROLLER]);
    const gece = startNightWithRoles([...ROLLER]);

    expect(nextLocalActor(rol)).toBeNull();
    expect(nextLocalActor(gece)).toBeNull();
  });
});

describe('rol gösterme', () => {
  it('rolünü görmemiş ilk yerel oyuncuyu veriyor', () => {
    const state = yerelYap(startWithRoles([...ROLLER]), 'p1', 'p2');

    expect(nextLocalActor(state)).toBe('p1');
  });

  it('sıradaki görünce bir sonrakine geçiyor', () => {
    let state = yerelYap(startWithRoles([...ROLLER]), 'p1', 'p2');

    state = reduce(state, { type: 'ROLE_SEEN', playerId: 'p1' }, T0);

    expect(nextLocalActor(state)).toBe('p2');
  });

  it('yerellerin hepsi görünce null — UZAKTAKİLER beklenmiyor', () => {
    let state = yerelYap(startWithRoles([...ROLLER]), 'p1');
    // p0 (kurucu) ve p3 uzakta; henüz rollerini görmediler.
    state = reduce(state, { type: 'ROLE_SEEN', playerId: 'p1' }, T0);

    expect(state.players.filter((p) => !p.ready).length).toBeGreaterThan(0);
    expect(nextLocalActor(state)).toBeNull();
  });
});

describe('gece', () => {
  it('o adımda oynayacak yerel oyuncuyu veriyor', () => {
    // p0 vampir; vampir adımında sıra onda olmalı.
    const state = yerelYap(startNightWithRoles([...ROLLER]), 'p0');

    expect(state.phase).toBe('NIGHT');
    expect(nextLocalActor(state)).toBe('p0');
  });

  it('yerel oyuncunun o adımda işi yoksa null', () => {
    // p1 köylü; gecenin hiçbir adımında oynamıyor.
    const state = yerelYap(startNightWithRoles([...ROLLER]), 'p1');

    expect(nextLocalActor(state)).toBeNull();
  });

  it('hamlesini yapınca sıradan düşüyor', () => {
    let state = yerelYap(startNightWithRoles([...ROLLER]), 'p0');

    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p1' }, T0);

    expect(nextLocalActor(state)).toBeNull();
  });
});

describe('oylama', () => {
  it('oy vermemiş yerel oyuncuyu veriyor, verince düşüyor', () => {
    let state = yerelYap(startNightWithRoles([...ROLLER]), 'p1');
    // Geceyi ve gündüzü süreyle geçip oylamaya gel.
    for (let i = 0; i < 40 && state.phase !== 'VOTE'; i++) {
      state = reduce(state, { type: 'TIMEOUT' }, T0 + i * 1000);
    }
    expect(state.phase).toBe('VOTE');

    const sira = nextLocalActor(state);
    expect(sira).toBe('p1');

    state = reduce(state, { type: 'VOTE', playerId: 'p1', targetId: 'abstain' }, T0);
    expect(nextLocalActor(state)).toBeNull();
  });
});

describe('ortak ekranlar', () => {
  it('gündüz tartışmasında sıra kimsede değil', () => {
    let state = yerelYap(startNightWithRoles([...ROLLER]), 'p0', 'p1');
    for (let i = 0; i < 40 && state.phase !== 'DAY_DISCUSSION'; i++) {
      state = reduce(state, { type: 'TIMEOUT' }, T0 + i * 1000);
    }

    expect(state.phase).toBe('DAY_DISCUSSION');
    // Tartışma masanın ortasında yüksek sesle; telefon dolaştırılmaz.
    expect(nextLocalActor(state)).toBeNull();
  });
});

describe('oyundan çıkan yerel oyuncu', () => {
  it('sıraya girmiyor', () => {
    let state = yerelYap(startWithRoles([...ROLLER]), 'p1', 'p2');

    state = reduce(state, { type: 'PLAYER_LEFT', playerId: 'p1' }, T0);

    expect(nextLocalActor(state)).toBe('p2');
  });
});
