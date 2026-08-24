import { describe, expect, it } from 'vitest';
import { createInitialState, reduce } from './stateMachine';
import { buildPlayerView } from './view';
import type { GameState, PlayerId } from './types';
import { T0 } from './testUtils';

/**
 * 07-tasks.md M3: "simüle edilmiş 100 rastgele oyun çökmüyor".
 * Botlar geçerli aksiyonlardan rastgele seçer, arada oyuncular kopar.
 */

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

function playRandomGame(seed: number): { state: GameState; steps: number } {
  const rnd = mulberry32(seed);
  const playerCount = 5 + Math.floor(rnd() * 16); // 5..20 (üst sınır yok)
  let state = createInitialState(seed);

  for (let i = 0; i < playerCount; i++) {
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
  state = reduce(state, { type: 'START_GAME' }, T0);
  expect(state.phase).toBe('ROLE_REVEAL');

  const pickRandom = <T,>(items: T[]): T | undefined =>
    items.length === 0 ? undefined : items[Math.floor(rnd() * items.length)];

  let steps = 0;
  const MAX_STEPS = 4000;
  let now = T0;

  while (state.phase !== 'GAME_END' && steps < MAX_STEPS) {
    steps += 1;
    now += 1000;

    // Her adımda küçük bir kopma ihtimali.
    if (rnd() < 0.01) {
      const candidates = state.players.filter((p) => !p.left && p.alive && !p.isHost);
      const victim = pickRandom(candidates);
      if (victim) {
        state = reduce(state, { type: 'PLAYER_LEFT', playerId: victim.id }, now);
        continue;
      }
    }

    // Bazen kimse aksiyon almadan süre dolar.
    if (rnd() < 0.15) {
      state = reduce(state, { type: 'TIMEOUT' }, now);
      continue;
    }

    switch (state.phase) {
      case 'ROLE_REVEAL': {
        const waiting = state.players.filter((p) => p.isPlayer && !p.left && !p.ready);
        const who = pickRandom(waiting);
        state = who
          ? reduce(state, { type: 'ROLE_SEEN', playerId: who.id }, now)
          : reduce(state, { type: 'TIMEOUT' }, now);
        break;
      }
      case 'NIGHT': {
        const actors = state.players.filter((p) => p.isPlayer && p.alive && !p.left);
        const who = pickRandom(actors);
        if (!who) {
          state = reduce(state, { type: 'TIMEOUT' }, now);
          break;
        }
        const view = buildPlayerView(state, 'ROOM', who.id);
        if (!view.nightAction.canAct) {
          state = reduce(state, { type: 'TIMEOUT' }, now);
          break;
        }
        const target = rnd() < 0.1 ? null : (pickRandom(view.nightAction.validTargets) ?? null);
        state = reduce(state, { type: 'NIGHT_ACTION', playerId: who.id, targetId: target }, now);
        break;
      }
      case 'VOTE': {
        const voters = state.players.filter(
          (p) => p.isPlayer && p.alive && !p.left && !(p.id in state.votes),
        );
        const who = pickRandom(voters);
        if (!who) {
          state = reduce(state, { type: 'TIMEOUT' }, now);
          break;
        }
        const alive = state.players.filter((p) => p.isPlayer && p.alive && !p.left);
        const target: PlayerId | 'abstain' =
          rnd() < 0.2 ? 'abstain' : ((pickRandom(alive)?.id as PlayerId) ?? 'abstain');
        state = reduce(state, { type: 'VOTE', playerId: who.id, targetId: target }, now);
        break;
      }
      case 'HUNTER_SHOT': {
        const hunterId = state.pendingHunter?.hunterId;
        if (!hunterId) {
          state = reduce(state, { type: 'TIMEOUT' }, now);
          break;
        }
        const view = buildPlayerView(state, 'ROOM', hunterId);
        const target = rnd() < 0.3 ? null : (pickRandom(view.hunter.validTargets) ?? null);
        state = reduce(state, { type: 'HUNTER_SHOT', playerId: hunterId, targetId: target }, now);
        break;
      }
      case 'DAY_DISCUSSION': {
        state = reduce(state, { type: rnd() < 0.5 ? 'END_DISCUSSION' : 'TIMEOUT' }, now);
        break;
      }
      default: {
        state = reduce(state, { type: 'TIMEOUT' }, now);
        break;
      }
    }
  }

  return { state, steps };
}

describe('rastgele oyun simülasyonu', () => {
  it('100 rastgele oyun çökmeden bitiyor', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const { state, steps } = playRandomGame(seed);
      expect(state.phase, `seed ${seed} bitmedi (${steps} adım)`).toBe('GAME_END');
      expect(state.winner, `seed ${seed} kazananı yok`).not.toBeNull();

      // Tutarlılık: ölü sayısı ölüm kaydıyla eşleşmeli
      const deadCount = state.players.filter((p) => p.isPlayer && !p.alive).length;
      expect(deadCount).toBe(new Set(state.deaths.map((d) => d.playerId)).size);

      // Terk eden oyuncu ölüm kaydına girmemeli
      for (const death of state.deaths) {
        const p = state.players.find((x) => x.id === death.playerId)!;
        expect(p.alive).toBe(false);
      }
    }
  });

  it('her simülasyon aynı tohumla aynı sonucu verir', () => {
    const a = playRandomGame(7).state;
    const b = playRandomGame(7).state;
    expect(a.winner).toBe(b.winner);
    expect(a.deaths).toEqual(b.deaths);
    expect(a.log.map((l) => l.key)).toEqual(b.log.map((l) => l.key));
  });
});
