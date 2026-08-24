import { describe, expect, it } from 'vitest';
import { checkWinner, createInitialState, reduce } from './stateMachine';
import {
  distributionFor,
  isSupportedPlayerCount,
  ROLE_DISTRIBUTION,
  vampireCountFor,
} from './distribution';
import { ROLES } from './roles';
import {
  T0,
  apply,
  idsWithRole,
  narrationKeys,
  player,
  seatPlayers,
  startNightWithRoles,
  startWithRoles,
} from './testUtils';
import type { RoleId } from './types';

const FIVE: RoleId[] = ['vampire', 'seer', 'doctor', 'villager', 'villager'];
const SIX: RoleId[] = ['vampire', 'seer', 'doctor', 'hunter', 'villager', 'villager'];

describe('rol dağılımı (03-roles.md)', () => {
  it('tabloda tanımlı her oyuncu sayısı için toplam rol sayısı tutar', () => {
    for (const count of Object.keys(ROLE_DISTRIBUTION).map(Number)) {
      expect(distributionFor(count)).toHaveLength(count);
    }
  });

  it('5 kişilik oyunda avcı yok, 6 kişilikte var', () => {
    expect(distributionFor(5).filter((r) => r === 'hunter')).toHaveLength(0);
    expect(distributionFor(6).filter((r) => r === 'hunter')).toHaveLength(1);
  });

  it('üst sınır yok; 12 üstünde tablonun örüntüsü sürer', () => {
    expect(isSupportedPlayerCount(4)).toBe(false);
    expect(isSupportedPlayerCount(5)).toBe(true);
    expect(isSupportedPlayerCount(24)).toBe(true);

    for (const count of [13, 16, 20, 24]) {
      const roles = distributionFor(count);
      expect(roles).toHaveLength(count);
      expect(roles.filter((r) => r === 'seer')).toHaveLength(1);
      expect(roles.filter((r) => r === 'doctor')).toHaveLength(1);
      expect(roles.filter((r) => r === 'hunter')).toHaveLength(1);
      expect(roles.filter((r) => r === 'vampire')).toHaveLength(vampireCountFor(count));
      // Kalan herkes düz köylü
      expect(roles.filter((r) => r === 'villager')).toHaveLength(
        count - vampireCountFor(count) - 3,
      );
    }
  });

  it('vampir formülü 5–12 tablosunu birebir üretiyor', () => {
    for (const [count, table] of Object.entries(ROLE_DISTRIBUTION)) {
      expect(vampireCountFor(Number(count))).toBe(table.vampire);
    }
  });

  it('vampirler her zaman azınlıkta başlar', () => {
    for (let count = 5; count <= 30; count++) {
      const roles = distributionFor(count);
      const vampires = roles.filter((r) => r === 'vampire').length;
      expect(vampires).toBeLessThan(count - vampires);
    }
  });
});

describe('lobi', () => {
  it('5 kişiden az oyuncuyla oyun başlamaz', () => {
    const state = reduce(seatPlayers(4), { type: 'START_GAME' }, T0);
    expect(state.phase).toBe('LOBBY');
  });

  it('oyun başlayınca herkes rol alır ve ROLE_REVEAL fazına geçilir', () => {
    const state = reduce(seatPlayers(7), { type: 'START_GAME' }, T0);
    expect(state.phase).toBe('ROLE_REVEAL');
    expect(state.players.every((p) => p.role)).toBe(true);
    expect(state.players.filter((p) => p.role === 'vampire')).toHaveLength(2);
  });

  it('host anlatıcı modunda rol dağıtımına girmez', () => {
    let state = seatPlayers(6);
    state = reduce(state, { type: 'UPDATE_SETTINGS', settings: { hostPlays: false } }, T0);
    state = reduce(state, { type: 'START_GAME' }, T0);
    // 6 kişiden host düşünce 5 oyuncu kalır
    expect(state.phase).toBe('ROLE_REVEAL');
    expect(state.players.filter((p) => p.role)).toHaveLength(5);
    expect(player(state, 'p0').role).toBeUndefined();
  });

  it('oda dolu ise yeni oyuncu eklenmez', () => {
    let state = seatPlayers(12);
    expect(state.settings.maxPlayers).toBe(12);
    state = reduce(
      state,
      {
        type: 'ADD_PLAYER',
        player: {
          id: 'p12',
          name: 'P12',
          color: '#fff',
          isHost: false,
          isPlayer: true,
          connected: true,
        },
      },
      T0,
    );
    expect(state.players).toHaveLength(12);
  });
});

describe('gece çözümlemesi', () => {
  it('korunmayan hedef ölür', () => {
    let state = startNightWithRoles(FIVE);
    expect(state.phase).toBe('NIGHT');
    state = apply(state, [
      { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p3' },
      { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p0' },
      { type: 'NIGHT_ACTION', playerId: 'p2', targetId: 'p4' },
    ]);
    expect(player(state, 'p3').alive).toBe(false);
    expect(player(state, 'p3').deathCause).toBe('vampire');
    expect(narrationKeys(state)).toContain('night_death');
    expect(state.phase).toBe('NIGHT_RESULT');
  });

  it('doktor hedefi korursa kimse ölmez', () => {
    let state = startNightWithRoles(FIVE);
    state = apply(state, [
      { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p3' },
      { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p0' },
      { type: 'NIGHT_ACTION', playerId: 'p2', targetId: 'p3' },
    ]);
    expect(player(state, 'p3').alive).toBe(true);
    expect(narrationKeys(state)).toContain('night_saved');
  });

  it('doktor kendini koruyabilir', () => {
    const state = startNightWithRoles(FIVE);
    const targets = ROLES.doctor.nightAction!.validTargets(state, 'p2');
    expect(targets).toContain('p2');
  });

  it('doktor aynı kişiyi üst üste iki gece koruyamaz', () => {
    let state = startNightWithRoles(FIVE);
    state = apply(state, [
      { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p3' },
      { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p0' },
      { type: 'NIGHT_ACTION', playerId: 'p2', targetId: 'p3' },
    ]);
    // NIGHT_RESULT → DAY → VOTE → VOTE_RESULT (kimse oy vermedi) → NIGHT
    state = apply(state, [
      { type: 'TIMEOUT' },
      { type: 'TIMEOUT' },
      { type: 'TIMEOUT' },
      { type: 'TIMEOUT' },
    ]);
    expect(state.phase).toBe('NIGHT');
    const targets = ROLES.doctor.nightAction!.validTargets(state, 'p2');
    expect(targets).not.toContain('p3');
  });

  it('kâhin cevabını seçim anında alır', () => {
    let state = startNightWithRoles(FIVE);
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p0' }, T0);
    expect(state.seerResults['p1']).toEqual([{ round: 1, targetId: 'p0', isVampire: true }]);
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p4' }, T0);
    // İkinci aksiyon aynı gecede kabul edilmez
    expect(state.seerResults['p1']).toHaveLength(1);
  });

  it('süre dolunca aksiyonlar pas sayılır ve kimse ölmez', () => {
    let state = startNightWithRoles(FIVE);
    state = reduce(state, { type: 'TIMEOUT' }, T0 + 60_000);
    expect(narrationKeys(state)).toContain('no_death');
    expect(state.players.every((p) => p.alive)).toBe(true);
  });

  it('vampir kendini de takım arkadaşını da hedefleyebilir', () => {
    const roles: RoleId[] = ['vampire', 'vampire', 'seer', 'doctor', 'hunter', 'villager', 'villager'];
    let state = startNightWithRoles(roles);
    const targets = ROLES.vampire.nightAction!.validTargets(state, 'p0');
    expect(targets).toContain('p1');
    expect(targets).toContain('p0');

    // Kendi takımını gerçekten öldürebilir
    state = apply(state, [
      { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p1' },
      { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p1' },
      { type: 'NIGHT_ACTION', playerId: 'p2', targetId: 'p0' },
      { type: 'NIGHT_ACTION', playerId: 'p3', targetId: 'p4' },
    ]);
    expect(player(state, 'p1').alive).toBe(false);
  });

  it('vampir oyları eşitse rastgele ama deterministik seçilir', () => {
    const roles: RoleId[] = ['vampire', 'vampire', 'seer', 'doctor', 'hunter', 'villager', 'villager'];
    const run = (seed: number) => {
      let state = startNightWithRoles(roles, seed);
      state = apply(state, [
        { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p5' },
        { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p6' },
        { type: 'TIMEOUT' },
      ]);
      return state.deaths.map((d) => d.playerId);
    };
    const a = run(7);
    const b = run(7);
    expect(a).toEqual(b);
    expect(a).toHaveLength(1);
    expect(['p5', 'p6']).toContain(a[0]);
  });
});

describe('oylama', () => {
  function toVote(state = startNightWithRoles(FIVE)) {
    // gece pas → gündüz → oylama
    let s = reduce(state, { type: 'TIMEOUT' }, T0);
    s = reduce(s, { type: 'TIMEOUT' }, T0); // NIGHT_RESULT → DAY
    s = reduce(s, { type: 'END_DISCUSSION' }, T0);
    return s;
  }

  it('çoğunluk asılır ama rolü açıklanmaz', () => {
    let state = toVote();
    state = apply(state, [
      { type: 'VOTE', playerId: 'p0', targetId: 'p3' },
      { type: 'VOTE', playerId: 'p1', targetId: 'p3' },
      { type: 'VOTE', playerId: 'p2', targetId: 'p3' },
      { type: 'VOTE', playerId: 'p3', targetId: 'abstain' },
      { type: 'VOTE', playerId: 'p4', targetId: 'p0' },
    ]);
    expect(player(state, 'p3').alive).toBe(false);
    expect(player(state, 'p3').deathCause).toBe('hanging');
    const hangedEvent = state.log.find((e) => e.key === 'vote_hanged');
    expect(hangedEvent?.params?.name).toBe('P3');
    expect(hangedEvent?.params?.roleKey).toBeUndefined();
  });

  it('eşitlikte kimse asılmaz', () => {
    let state = toVote();
    state = apply(state, [
      { type: 'VOTE', playerId: 'p0', targetId: 'p3' },
      { type: 'VOTE', playerId: 'p1', targetId: 'p3' },
      { type: 'VOTE', playerId: 'p2', targetId: 'p4' },
      { type: 'VOTE', playerId: 'p3', targetId: 'p4' },
      { type: 'VOTE', playerId: 'p4', targetId: 'abstain' },
    ]);
    expect(state.players.filter((p) => !p.alive)).toHaveLength(0);
    expect(narrationKeys(state)).toContain('vote_tie');
  });

  it('herkes çekimserse kimse asılmaz', () => {
    let state = toVote();
    state = apply(
      state,
      state.players.map((p) => ({ type: 'VOTE' as const, playerId: p.id, targetId: 'abstain' as const })),
    );
    expect(narrationKeys(state)).toContain('vote_none');
  });

  it('oylamada kopan oyuncu çekimser sayılır', () => {
    let state = toVote();
    state = apply(state, [
      { type: 'VOTE', playerId: 'p0', targetId: 'p3' },
      { type: 'VOTE', playerId: 'p1', targetId: 'p3' },
      { type: 'VOTE', playerId: 'p2', targetId: 'p3' },
      { type: 'VOTE', playerId: 'p3', targetId: 'p0' },
    ]);
    expect(state.phase).toBe('VOTE');
    state = reduce(state, { type: 'TIMEOUT' }, T0 + 45_000);
    expect(player(state, 'p3').alive).toBe(false);
  });
});

describe('avcı', () => {
  it('gece ölen avcı son okunu atar', () => {
    let state = startNightWithRoles(SIX);
    state = apply(state, [
      { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p3' }, // vampir → avcı
      { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p0' },
      { type: 'NIGHT_ACTION', playerId: 'p2', targetId: 'p4' },
    ]);
    expect(state.phase).toBe('HUNTER_SHOT');
    expect(state.pendingHunter?.hunterId).toBe('p3');

    state = reduce(state, { type: 'HUNTER_SHOT', playerId: 'p3', targetId: 'p0' }, T0);
    expect(player(state, 'p0').alive).toBe(false);
    expect(player(state, 'p0').deathCause).toBe('hunter');
    expect(state.phase).toBe('NIGHT_RESULT');
  });

  it('avcı süresinde seçmezse hak yanar', () => {
    let state = startNightWithRoles(SIX);
    state = apply(state, [
      { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p3' },
      { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p0' },
      { type: 'NIGHT_ACTION', playerId: 'p2', targetId: 'p4' },
    ]);
    state = reduce(state, { type: 'TIMEOUT' }, T0 + 30_000);
    expect(narrationKeys(state)).toContain('hunter_pass');
    expect(state.phase).toBe('NIGHT_RESULT');
    expect(player(state, 'p0').alive).toBe(true);
  });

  it('asılan avcı da son okunu atar', () => {
    let state = startNightWithRoles(SIX);
    state = apply(state, [{ type: 'TIMEOUT' }, { type: 'TIMEOUT' }, { type: 'END_DISCUSSION' }]);
    expect(state.phase).toBe('VOTE');
    state = apply(state, [
      { type: 'VOTE', playerId: 'p0', targetId: 'p3' },
      { type: 'VOTE', playerId: 'p1', targetId: 'p3' },
      { type: 'VOTE', playerId: 'p2', targetId: 'p3' },
      { type: 'VOTE', playerId: 'p3', targetId: 'abstain' },
      { type: 'VOTE', playerId: 'p4', targetId: 'abstain' },
      { type: 'VOTE', playerId: 'p5', targetId: 'abstain' },
    ]);
    expect(state.phase).toBe('HUNTER_SHOT');
    state = reduce(state, { type: 'HUNTER_SHOT', playerId: 'p3', targetId: 'p0' }, T0);
    expect(state.phase).toBe('VOTE_RESULT');
    expect(player(state, 'p0').alive).toBe(false);
  });
});

describe('kazanma koşulları', () => {
  it('tüm vampirler ölünce köy kazanır', () => {
    let state = startNightWithRoles(FIVE);
    state = apply(state, [{ type: 'TIMEOUT' }, { type: 'TIMEOUT' }, { type: 'END_DISCUSSION' }]);
    state = apply(state, [
      { type: 'VOTE', playerId: 'p0', targetId: 'p0' },
      { type: 'VOTE', playerId: 'p1', targetId: 'p0' },
      { type: 'VOTE', playerId: 'p2', targetId: 'p0' },
      { type: 'VOTE', playerId: 'p3', targetId: 'p0' },
      { type: 'VOTE', playerId: 'p4', targetId: 'p0' },
    ]);
    expect(state.phase).toBe('VOTE_RESULT');
    state = reduce(state, { type: 'TIMEOUT' }, T0);
    expect(state.phase).toBe('GAME_END');
    expect(state.winner).toBe('village');
    expect(narrationKeys(state)).toContain('win_village');
  });

  it('vampir sayısı köylü sayısına eşitlenince vampirler kazanır', () => {
    const roles: RoleId[] = ['vampire', 'seer', 'doctor', 'villager', 'villager'];
    let state = startNightWithRoles(roles);

    // NIGHT_RESULT → DAY → VOTE → VOTE_RESULT → NIGHT (kimse asılmaz)
    const quietDay = (s: typeof state) =>
      apply(s, [{ type: 'TIMEOUT' }, { type: 'TIMEOUT' }, { type: 'TIMEOUT' }, { type: 'TIMEOUT' }]);

    // 1. gece: p3 ölür → 1 vampir / 3 köylü
    state = apply(state, [
      { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p3' },
      { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p2' },
      { type: 'NIGHT_ACTION', playerId: 'p2', targetId: 'p2' },
    ]);
    state = quietDay(state);
    expect(state.phase).toBe('NIGHT');

    // 2. gece: p4 ölür → 1 vampir / 2 köylü
    state = apply(state, [
      { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p4' },
      { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p2' },
      { type: 'NIGHT_ACTION', playerId: 'p2', targetId: 'p1' },
    ]);
    state = quietDay(state);
    expect(state.phase).toBe('NIGHT');

    // 3. gece: p1 ölür → 1 vampir / 1 köylü → vampirler kazanır
    state = apply(state, [
      { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p1' },
      { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p2' },
      { type: 'NIGHT_ACTION', playerId: 'p2', targetId: 'p2' },
    ]);
    expect(state.phase).toBe('NIGHT_RESULT');
    state = reduce(state, { type: 'TIMEOUT' }, T0); // kazanma kontrolü
    expect(state.winner).toBe('vampire');
    expect(state.phase).toBe('GAME_END');
  });

  it('checkWinner terk eden oyuncuları hesaba katar', () => {
    let state = startNightWithRoles(FIVE);
    state = reduce(state, { type: 'PLAYER_LEFT', playerId: 'p0' }, T0);
    expect(checkWinner(state)).toBe('village');
    expect(state.phase).toBe('GAME_END');
  });
});

describe('kopma senaryoları', () => {
  it('terk eden oyuncu ölüm sayılmaz, anlatıma işlenir', () => {
    let state = startNightWithRoles(SIX);
    state = reduce(state, { type: 'PLAYER_LEFT', playerId: 'p4' }, T0);
    expect(player(state, 'p4').left).toBe(true);
    expect(state.deaths).toHaveLength(0);
    expect(narrationKeys(state)).toContain('player_left');
  });

  it('gece aksiyonu bekleyen oyuncu koparsa gece yine çözülür', () => {
    let state = startNightWithRoles(SIX);
    state = apply(state, [
      { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p4' },
      { type: 'NIGHT_ACTION', playerId: 'p2', targetId: 'p4' },
    ]);
    expect(state.phase).toBe('NIGHT');
    state = reduce(state, { type: 'PLAYER_LEFT', playerId: 'p1' }, T0); // kâhin koptu
    expect(state.phase).toBe('NIGHT_RESULT');
  });

  it('lobide kopan oyuncu listeden çıkar', () => {
    let state = seatPlayers(6);
    state = reduce(state, { type: 'PLAYER_LEFT', playerId: 'p5' }, T0);
    expect(state.players).toHaveLength(5);
  });

  it('aynı playerToken ile dönen oyuncu kimliğini korur', () => {
    let state = startNightWithRoles(SIX);
    state = reduce(state, { type: 'SET_CONNECTED', playerId: 'p2', connected: false }, T0);
    expect(player(state, 'p2').connected).toBe(false);
    state = reduce(
      state,
      {
        type: 'ADD_PLAYER',
        player: {
          id: 'p2',
          name: 'P2',
          color: '#888888',
          isHost: false,
          isPlayer: true,
          connected: true,
        },
      },
      T0,
    );
    expect(player(state, 'p2').connected).toBe(true);
    expect(player(state, 'p2').role).toBe('doctor');
    expect(state.players).toHaveLength(6);
  });
});

describe('yeniden başlatma', () => {
  it('RESTART lobiye döner, oyuncular kalır, roller silinir', () => {
    let state = startNightWithRoles(SIX);
    state = reduce(state, { type: 'RESTART' }, T0);
    expect(state.phase).toBe('LOBBY');
    expect(state.players).toHaveLength(6);
    expect(state.players.every((p) => !p.role && p.alive)).toBe(true);
  });
});

describe('geçersiz aksiyonlar', () => {
  it('ölü oyuncu oy veremez', () => {
    let state = startNightWithRoles(FIVE);
    state = apply(state, [
      { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p3' },
      { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p0' },
      { type: 'NIGHT_ACTION', playerId: 'p2', targetId: 'p4' },
      { type: 'TIMEOUT' },
      { type: 'END_DISCUSSION' },
    ]);
    expect(state.phase).toBe('VOTE');
    const before = { ...state.votes };
    state = reduce(state, { type: 'VOTE', playerId: 'p3', targetId: 'p0' }, T0);
    expect(state.votes).toEqual(before);
  });

  it('geçersiz gece hedefi yok sayılır', () => {
    let state = startNightWithRoles(FIVE);
    // Odada olmayan oyuncu
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'yok' }, T0);
    expect(state.night.vampireVotes).toEqual({});

    // Doktorun üst üste koruma yasağı da hedef doğrulamasından geçer
    state = { ...state, lastProtected: { p2: 'p4' } };
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p2', targetId: 'p4' }, T0);
    expect(state.night.doctorSaves).toEqual({});
  });

  it('yanlış oyuncu avcının okunu kullanamaz', () => {
    let state = startNightWithRoles(SIX);
    state = apply(state, [
      { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p3' },
      { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p0' },
      { type: 'NIGHT_ACTION', playerId: 'p2', targetId: 'p4' },
    ]);
    state = reduce(state, { type: 'HUNTER_SHOT', playerId: 'p4', targetId: 'p0' }, T0);
    expect(state.phase).toBe('HUNTER_SHOT');
    expect(player(state, 'p0').alive).toBe(true);
  });

  it('oyun başladıktan sonra ayar değişmez', () => {
    let state = startNightWithRoles(FIVE);
    state = reduce(state, { type: 'UPDATE_SETTINGS', settings: { discussionSeconds: 10 } }, T0);
    expect(state.settings.discussionSeconds).toBe(180);
  });
});

describe('başlangıç durumu', () => {
  it('boş oyun LOBBY fazındadır', () => {
    const state = createInitialState(1);
    expect(state.phase).toBe('LOBBY');
    expect(state.players).toHaveLength(0);
    expect(state.winner).toBeNull();
  });

  it('vampirler birbirini bilir, köylüler bilmez', () => {
    const state = startWithRoles(SIX);
    expect(ROLES[player(state, idsWithRole(state, 'vampire')[0]).role!].knowsTeammates).toBe(true);
    expect(ROLES.villager.knowsTeammates).toBeUndefined();
  });
});
