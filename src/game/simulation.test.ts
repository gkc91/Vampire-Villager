import { describe, expect, it } from 'vitest';
import { createInitialState, reduce } from './stateMachine';
import { buildPlayerView } from './view';
import { botAction } from './bot';
import { suggestedRoles } from './distribution';
import { isVampireRole } from './roles/helpers';
import type { GameState } from './types';
import { T0 } from './testUtils';

/**
 * 07-tasks.md: "simüle edilmiş 100 rastgele oyun çökmüyor".
 * Botlar gerçek `botAction` ile oynar — yani yalnız kendi filtrelenmiş
 * görünümlerini kullanırlar; simülasyon aynı zamanda bot mantığını sınar.
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
  const playerCount = 4 + Math.floor(rnd() * 13); // 4..16
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
  state = reduce(
    state,
    { type: 'UPDATE_SETTINGS', settings: { maxPlayers: playerCount, roleSetup: suggestedRoles(playerCount) } },
    T0,
  );
  state = reduce(state, { type: 'START_GAME' }, T0);
  expect(state.phase).toBe('ROLE_REVEAL');

  let steps = 0;
  const MAX_STEPS = 6000;
  let now = T0;

  while (state.phase !== 'GAME_END' && steps < MAX_STEPS) {
    steps += 1;
    now += 1000;

    // Küçük kopma ihtimali.
    if (rnd() < 0.01) {
      const candidates = state.players.filter((p) => !p.left && p.alive && !p.isHost);
      if (candidates.length > 0) {
        const victim = candidates[Math.floor(rnd() * candidates.length)];
        state = reduce(state, { type: 'PLAYER_LEFT', playerId: victim.id }, now);
        continue;
      }
    }

    // Bazen kimse oynamadan süre dolar.
    if (rnd() < 0.12) {
      state = reduce(state, { type: 'TIMEOUT' }, now);
      continue;
    }

    // Sırası gelen oyuncular botAction ile oynasın.
    const actors = state.players.filter((p) => p.isPlayer && p.alive && !p.left);
    let acted = false;
    for (const actor of actors) {
      const view = buildPlayerView(state, 'ROOM', actor.id);
      const action = botAction(view, rnd);
      if (!action) continue;
      state = reduce(state, action, now);
      acted = true;
      break;
    }
    if (!acted) state = reduce(state, { type: 'TIMEOUT' }, now);
  }

  return { state, steps };
}

describe('rastgele oyun simülasyonu', () => {
  it('100 rastgele oyun çökmeden bitiyor', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const { state, steps } = playRandomGame(seed);
      expect(state.phase, `seed ${seed} bitmedi (${steps} adım)`).toBe('GAME_END');
      expect(state.winner, `seed ${seed} kazananı yok`).not.toBeNull();

      // Ölü sayısı ölüm kaydıyla tutarlı olmalı
      const dead = state.players.filter((p) => p.isPlayer && !p.alive).length;
      expect(dead).toBe(new Set(state.deaths.map((d) => d.playerId)).size);

      // Kullanım hakkı asla eksiye düşmemeli
      for (const p of state.players) {
        if (p.usesLeft !== undefined) expect(p.usesLeft).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('kazanan taraf oyun sonu durumuyla tutarlı', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const { state } = playRandomGame(seed);
      const aliveVampires = state.players.filter(
        (p) => p.isPlayer && p.alive && !p.left && isVampireRole(p.role),
      ).length;
      if (state.winner === 'village') expect(aliveVampires).toBe(0);
      else expect(aliveVampires).toBeGreaterThan(0);
    }
  });

  it('aynı tohum aynı sonucu verir', () => {
    const a = playRandomGame(7).state;
    const b = playRandomGame(7).state;
    expect(a.winner).toBe(b.winner);
    expect(a.deaths).toEqual(b.deaths);
    expect(a.log.map((l) => l.key)).toEqual(b.log.map((l) => l.key));
  });
});
