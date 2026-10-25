import { describe, expect, it } from 'vitest';
import { createInitialState, reduce } from '../game/stateMachine';
import { buildPlayerView } from '../game/view';
import { botAction } from '../game/bot';
import { suggestedRoles } from '../game/distribution';
import type { GameState, NarrationEvent } from '../game/types';
import { T0 } from '../game/testUtils';
import { sesliOkunabilir } from './narrationVisibility';

/**
 * ANLATICI KİMİN SIRRINI OKUYOR?
 *
 * NEDEN TEST VAR: anlatıcı, oyuncunun görünümündeki HER yeni kaydı sesli
 * okuyordu — kişiye özel olanları da. Ekranda sorun yok, `onlyFor` oraya
 * başkasını sokmuyor; ama ses hoparlörden çıkıyor ve masadaki herkes
 * duyuyor. "Vampire dönüştürüldün" cümlesi yüksek sesle okununca oyun
 * biter.
 *
 * Üstelik ayarlardaki ipucu kullanıcıyı tam oraya yönlendiriyordu: "Aynı
 * odada oynuyorsanız kurucunun cihazında açın."
 *
 * Bu test gerçek motoru çalıştırıp ürettiği anlatımlara bakıyor; elle
 * uydurulmuş olaylara değil. Yeni bir gizli anlatım `onlyFor` almadan
 * eklenirse burada düşer.
 */

/** Gerçek bir oyunu botlarla sonuna kadar oynatır, tüm anlatımı döndürür. */
function oyunuOyna(seed: number): NarrationEvent[] {
  const rnd = mulberry32(seed);
  const oyuncuSayisi = 8;
  let state: GameState = createInitialState(seed);

  state = reduce(state, { type: 'UPDATE_SETTINGS', settings: { maxPlayers: oyuncuSayisi } }, T0);
  for (let i = 0; i < oyuncuSayisi; i++) {
    state = reduce(
      state,
      {
        type: 'ADD_PLAYER',
        player: {
          id: `p${i}`,
          name: `P${i}`,
          color: '#777',
          isHost: i === 0,
          isPlayer: true,
          connected: true,
        },
      },
      T0,
    );
  }
  state = reduce(
    state,
    { type: 'UPDATE_SETTINGS', settings: { roleSetup: suggestedRoles(oyuncuSayisi) } },
    T0,
  );
  state = reduce(state, { type: 'START_GAME' }, T0);

  let now = T0;
  for (let adim = 0; adim < 4000 && state.phase !== 'GAME_END'; adim++) {
    now += 1000;
    if (rnd() < 0.12) {
      state = reduce(state, { type: 'TIMEOUT' }, now);
      continue;
    }
    let oynadi = false;
    for (const actor of state.players.filter((p) => p.isPlayer && p.alive && !p.left)) {
      const action = botAction(buildPlayerView(state, 'ROOM', actor.id), rnd);
      if (action) {
        state = reduce(state, action, now);
        oynadi = true;
      }
    }
    if (!oynadi) state = reduce(state, { type: 'TIMEOUT' }, now);
  }
  return state.log;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KAYITLAR = Array.from({ length: 25 }, (_, i) => oyunuOyna(i + 1)).flat();

describe('sesli anlatım gizliliği', () => {
  it('test boşa dönmüyor: oyunlar gerçekten gizli anlatım üretti', () => {
    const gizli = KAYITLAR.filter((e) => e.onlyFor);

    // Bu düşerse testin kendisi anlamsızlaşmış demektir.
    expect(gizli.length).toBeGreaterThan(0);
  });

  it('kişiye özel hiçbir anlatım sesli okunmuyor', () => {
    const okunacakGizliler = KAYITLAR.filter((e) => e.onlyFor && sesliOkunabilir(e));

    expect(okunacakGizliler.map((e) => e.key)).toEqual([]);
  });

  it('herkese açık anlatım okunuyor — anlatıcı susturulmadı', () => {
    const acik = KAYITLAR.filter((e) => !e.onlyFor);

    expect(acik.length).toBeGreaterThan(0);
    expect(acik.every(sesliOkunabilir)).toBe(true);
  });

  it('"_self" ile biten her anlatım kişiye özel', () => {
    // İsimlendirme kuralı ile gizlilik kuralı birbirini tutuyor mu?
    // `acted_convert_self` gibi bir kayıt onlyFor almadan eklenirse
    // hem ekranda hem seste sızar.
    const kacaklar = KAYITLAR.filter((e) => e.key.endsWith('_self') && !e.onlyFor);

    expect([...new Set(kacaklar.map((e) => e.key))]).toEqual([]);
  });
});
