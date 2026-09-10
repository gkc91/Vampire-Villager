import { describe, expect, it } from 'vitest';
import { reduce } from './stateMachine';
import { buildPlayerView } from './view';
import { T0, startWithRoles } from './testUtils';
import type { RoleId } from './types';

/**
 * Vampirler birbirinin rolünü de görür.
 *
 * Masada anlatıcı vampirleri uyandırdığında hangisinin lord, hangisinin
 * kan büyücüsü olduğu bellidir; planı ona göre kurarlar. Köy ve tarafsız
 * roller bunu göremez.
 */

// p0 vampir, p1 vampir lordu, p2 kan büyücüsü, p3 kâhin, p4 köylü, p5 hırsız
const KADRO: RoleId[] = ['vampire', 'vampireLord', 'bloodWizard', 'seer', 'villager', 'thief'];

function basla() {
  let s = startWithRoles(KADRO);
  for (const p of s.players) s = reduce(s, { type: 'ROLE_SEEN', playerId: p.id }, T0);
  return s;
}

const rolleriGor = (state: ReturnType<typeof basla>, viewerId: string) =>
  Object.fromEntries(
    buildPlayerView(state, 'ROOM12', viewerId)
      .players.filter((p) => p.role)
      .map((p) => [p.id, p.role]),
  );

describe('vampir takımı birbirinin rolünü görür', () => {
  it('vampir, diğer vampirlerin rolünü ad ad görüyor', () => {
    const gorunen = rolleriGor(basla(), 'p0');
    expect(gorunen).toEqual({ p1: 'vampireLord', p2: 'bloodWizard' });
  });

  it('vampir lordu da aynı listeyi görüyor', () => {
    const gorunen = rolleriGor(basla(), 'p1');
    expect(gorunen).toEqual({ p0: 'vampire', p2: 'bloodWizard' });
  });

  it('köylü hiç kimsenin rolünü göremiyor', () => {
    expect(rolleriGor(basla(), 'p4')).toEqual({});
  });

  it('kâhin de göremiyor — bilgi rolü olması fark etmiyor', () => {
    expect(rolleriGor(basla(), 'p3')).toEqual({});
  });

  it('tarafsız (hırsız) göremiyor', () => {
    expect(rolleriGor(basla(), 'p5')).toEqual({});
  });

  it('vampir, köylülerin rolünü göremiyor', () => {
    const gorunen = rolleriGor(basla(), 'p0');
    expect(gorunen.p3, 'kâhin gizli kalmalı').toBeUndefined();
    expect(gorunen.p4, 'köylü gizli kalmalı').toBeUndefined();
    expect(gorunen.p5, 'hırsız gizli kalmalı').toBeUndefined();
  });
});
