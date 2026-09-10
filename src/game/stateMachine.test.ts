import { describe, expect, it } from 'vitest';
import { checkWinner, createInitialState, eligibleActors, reduce } from './stateMachine';
import {
  MIN_PLAYERS,
  suggestedRoles,
  validateRoleSetup,
  vampireCountFor,
} from './distribution';
import { isVampireRole } from './roles/helpers';
import { rolesForTiers } from './unlocks';
import {
  T0,
  apply,
  narrationKeys,
  player,
  privateKeys,
  quietDay,
  seatPlayers,
  skipNight,
  skipToStep,
  startNightWithRoles,
} from './testUtils';
import { buildPlayerView } from './view';
import type { RoleId } from './types';

/** 4 kişilik en küçük oyun. */
const TINY: RoleId[] = ['vampire', 'seer', 'doctor', 'villager'];

describe('rol önerisi ve kurulum (03-roles.md)', () => {
  it('minimum 4 oyuncu, üst sınır yok', () => {
    expect(MIN_PLAYERS).toBe(4);
    expect(suggestedRoles(4)).toHaveLength(4);
    expect(suggestedRoles(30)).toHaveLength(30);
  });

  it('vampirler her sayıda azınlıkta', () => {
    for (let n = 4; n <= 30; n++) {
      const roles = suggestedRoles(n);
      const vampires = roles.filter(isVampireRole).length;
      expect(vampires, `n=${n}`).toBeLessThan(n - vampires);
      expect(vampires).toBeGreaterThanOrEqual(1);
    }
  });

  it('özel roller kademeli açılır', () => {
    expect(suggestedRoles(5)).not.toContain('hunter');
    expect(suggestedRoles(6)).toContain('hunter');
    expect(suggestedRoles(7)).toContain('vampireLord');
    expect(suggestedRoles(8)).toContain('detective');
    expect(suggestedRoles(9)).toContain('thief');
    expect(suggestedRoles(10)).toContain('wizard');
    expect(suggestedRoles(10)).toContain('bloodWizard');
    expect(suggestedRoles(13)).toContain('mistVampire');
  });

  it('vampir sayısı formülü', () => {
    expect(vampireCountFor(6)).toBe(1);
    expect(vampireCountFor(7)).toBe(2);
    expect(vampireCountFor(13)).toBe(4);
  });

  it('kurucunun listesi yalnız iki kuralı çiğneyemez', () => {
    expect(validateRoleSetup(['vampire', 'villager', 'seer'], 3)).toBeNull();
    expect(validateRoleSetup(['vampire', 'villager'], 3)?.key).toBe('countMismatch');
    expect(validateRoleSetup(['villager', 'villager'], 2)?.key).toBe('noVampire');
    expect(validateRoleSetup(['vampire', 'vampire'], 2)?.key).toBe('noVillage');
  });

  it('kurucunun seçtiği liste dağıtılır', () => {
    let state = seatPlayers(5);
    const setup: RoleId[] = ['vampire', 'vampire', 'seer', 'villager', 'villager'];
    state = reduce(state, { type: 'UPDATE_SETTINGS', settings: { roleSetup: setup } }, T0);
    state = reduce(state, { type: 'START_GAME' }, T0);
    const dealt = state.players.map((p) => p.role).sort();
    expect(dealt).toEqual([...setup].sort());
  });

  it('TEST ARACI: sabitlenen rol o oyuncuya verilir', () => {
    let state = seatPlayers(6);
    state = reduce(
      state,
      { type: 'UPDATE_SETTINGS', settings: { forcedRoles: { p0: 'vampireLord' } } },
      T0,
    );
    state = reduce(state, { type: 'START_GAME' }, T0);

    expect(player(state, 'p0').role).toBe('vampireLord');
    expect(player(state, 'p0').usesLeft).toBe(1);
    // Diğer herkes yine geçerli bir rol alır
    expect(state.players.every((p) => Boolean(p.role))).toBe(true);
    expect(state.players.filter((p) => p.role === 'vampireLord')).toHaveLength(1);
  });

  it('TEST ARACI: sabitlenmezse dağıtım normal', () => {
    let state = seatPlayers(6);
    state = reduce(state, { type: 'START_GAME' }, T0);
    expect(state.players.every((p) => Boolean(p.role))).toBe(true);
  });

  it('4 kişiden az oyuncuyla başlamaz', () => {
    const state = reduce(seatPlayers(3), { type: 'START_GAME' }, T0);
    expect(state.phase).toBe('LOBBY');
  });
});

describe('gece sırası', () => {
  it('adımlar 03-roles.md sırasıyla işler', () => {
    const roles: RoleId[] = [
      'vampireLord',
      'bloodWizard',
      'mistVampire',
      'doctor',
      'seer',
      'detective',
      'thief',
      'villager',
      'villager',
      'villager',
    ];
    let state = startNightWithRoles(roles);
    const seen: (string | null)[] = [];
    for (let i = 0; i < 10 && state.phase === 'NIGHT'; i++) {
      seen.push(state.nightStep);
      state = reduce(state, { type: 'TIMEOUT' }, T0);
    }
    expect(seen).toEqual([
      'lord',
      'bloodWizard',
      'mist',
      'vampireVote',
      'doctor',
      'seer',
      'detective',
      'thief',
    ]);
  });

  it('oyuncusu olmayan adım atlanır', () => {
    const state = startNightWithRoles(TINY);
    // Lord/kan büyücüsü/sisler yok → doğrudan vampir oylaması
    expect(state.nightStep).toBe('vampireVote');
  });
});

describe('doktor', () => {
  it('koruduğu kişi ölmez', () => {
    let state = startNightWithRoles(TINY);
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p3' }, T0);
    expect(state.nightStep).toBe('doctor');
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p2', targetId: 'p3' }, T0);
    state = skipNight(state);
    expect(player(state, 'p3').alive).toBe(true);
    expect(narrationKeys(state)).toContain('night_saved');
  });

  it('oyun boyunca yalnız 2 kez korur', () => {
    let state = startNightWithRoles(TINY);
    expect(player(state, 'p2').usesLeft).toBe(2);

    state = skipToStep(state, 'doctor');
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p2', targetId: 'p1' }, T0);
    expect(player(state, 'p2').usesLeft).toBe(1);

    state = skipNight(state);
    state = quietDay(state);
    state = skipToStep(state, 'doctor');
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p2', targetId: 'p3' }, T0);
    expect(player(state, 'p2').usesLeft).toBe(0);

    state = skipNight(state);
    state = quietDay(state);
    // Hakkı bitti → doktor adımı hiç açılmaz
    expect(eligibleActors(state, 'doctor')).toEqual([]);
  });

  it('aynı kişiyi üst üste iki gece koruyamaz', () => {
    let state = startNightWithRoles(TINY);
    state = skipToStep(state, 'doctor');
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p2', targetId: 'p3' }, T0);
    state = skipNight(state);
    state = quietDay(state);
    state = skipToStep(state, 'doctor');
    const targets = eligibleActors(state, 'doctor').length > 0 ? state : state;
    expect(targets.lastProtected['p2']).toBe('p3');
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p2', targetId: 'p3' }, T0);
    // Geçersiz hedef: koruma kaydedilmedi
    expect(state.night.protectedId).toBeNull();
  });
});

describe('avcı', () => {
  const withHunter: RoleId[] = ['vampire', 'vampire', 'hunter', 'seer', 'villager', 'villager'];

  it('vampir saldırısı geri teper: kimse ölmez, bir vampir gizlice köylü olur', () => {
    let state = startNightWithRoles(withHunter);
    state = apply(state, [
      { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p2' },
      { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p2' },
    ]);
    state = skipNight(state);

    expect(player(state, 'p2').alive).toBe(true);
    expect(state.deaths).toHaveLength(0);
    expect(narrationKeys(state)).toContain('no_death');

    const vampiresLeft = state.players.filter((p) => isVampireRole(p.role)).length;
    expect(vampiresLeft).toBe(1);
    // Dönüşüm gizli: yalnız dönüşene bildirilir
    const converted = state.players.find((p) => ['p0', 'p1'].includes(p.id) && p.role === 'villager')!;
    expect(privateKeys(state, converted.id)).toContain('hunter_backfire_self');
    const other = converted.id === 'p0' ? 'p1' : 'p0';
    expect(privateKeys(state, other)).not.toContain('hunter_backfire_self');
  });

  it('her seferinde tekrar eder', () => {
    let state = startNightWithRoles(withHunter);
    state = apply(state, [
      { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p2' },
      { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p2' },
    ]);
    state = skipNight(state);
    state = quietDay(state);

    const remaining = state.players.find((p) => isVampireRole(p.role))!;
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: remaining.id, targetId: 'p2' }, T0);
    state = skipNight(state);

    expect(player(state, 'p2').alive).toBe(true);
    expect(state.players.filter((p) => isVampireRole(p.role))).toHaveLength(0);
  });

  it('gündüz asılabilir', () => {
    let state = startNightWithRoles(withHunter);
    state = skipNight(state);
    state = reduce(state, { type: 'TIMEOUT' }, T0); // → DAY
    state = reduce(state, { type: 'END_DISCUSSION' }, T0);
    state = apply(state, [
      { type: 'VOTE', playerId: 'p0', targetId: 'p2' },
      { type: 'VOTE', playerId: 'p1', targetId: 'p2' },
      { type: 'VOTE', playerId: 'p2', targetId: 'abstain' },
      { type: 'VOTE', playerId: 'p3', targetId: 'p2' },
      { type: 'VOTE', playerId: 'p4', targetId: 'abstain' },
      { type: 'VOTE', playerId: 'p5', targetId: 'abstain' },
    ]);
    expect(player(state, 'p2').alive).toBe(false);
    expect(player(state, 'p2').deathCause).toBe('hanging');
  });
});

describe('vampir lordu', () => {
  const roles: RoleId[] = ['vampireLord', 'vampire', 'seer', 'doctor', 'villager', 'villager'];

  it('dönüştürdüğü oyuncu vampir olur ve haberdar edilir', () => {
    let state = startNightWithRoles(roles);
    expect(state.nightStep).toBe('lord');
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p4' }, T0);

    expect(player(state, 'p4').role).toBe('vampire');
    expect(privateKeys(state, 'p4')).toContain('converted_self');
    expect(privateKeys(state, 'p2')).not.toContain('converted_self');
    expect(player(state, 'p0').usesLeft).toBe(0);
  });

  it('dönüştürülen o gece kurban seçimine katılamaz', () => {
    let state = startNightWithRoles(roles);
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p4' }, T0);
    state = skipToStep(state, 'vampireVote');
    expect(eligibleActors(state, 'vampireVote')).not.toContain('p4');
    expect(eligibleActors(state, 'vampireVote')).toContain('p0');
  });

  it('yeteneğini kullandıktan sonra kurban oylamasına da katılır', () => {
    let state = startNightWithRoles(roles);
    // Lord kendi adımında dönüştürme yapar
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p4' }, T0);
    state = skipToStep(state, 'vampireVote');

    // Kendi adımında oynamış olması onu oylamadan DIŞLAMAMALI
    expect(eligibleActors(state, 'vampireVote')).toContain('p0');
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p2' }, T0);
    expect(state.night.vampireVotes['p0']).toBe('p2');
  });

  it('avcıyı dönüştürmeye çalışırsa geri teper', () => {
    const withHunter: RoleId[] = ['vampireLord', 'vampire', 'hunter', 'seer', 'villager', 'villager'];
    let state = startNightWithRoles(withHunter);
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p2' }, T0);

    expect(player(state, 'p2').role).toBe('hunter');
    expect(state.players.filter((p) => isVampireRole(p.role))).toHaveLength(1);
  });
});

describe('kan büyücüsü', () => {
  const roles: RoleId[] = ['bloodWizard', 'vampire', 'seer', 'doctor', 'villager', 'villager'];

  it('mühürlenen oyuncu o gece uyanamaz', () => {
    let state = startNightWithRoles(roles);
    expect(state.nightStep).toBe('bloodWizard');
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p2' }, T0);

    expect(state.night.blocked).toContain('p2');
    state = skipToStep(state, 'seer');
    expect(state.phase === 'NIGHT' ? eligibleActors(state, 'seer') : []).not.toContain('p2');
  });

  it('mühürledikten sonra kurban oylamasına katılabilir', () => {
    let state = startNightWithRoles(roles);
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p2' }, T0);
    state = skipToStep(state, 'vampireVote');
    expect(eligibleActors(state, 'vampireVote')).toContain('p0');
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p3' }, T0);
    expect(state.night.vampireVotes['p0']).toBe('p3');
  });

  it('avcıyı mühürleyemez, avcı uyarılır', () => {
    const withHunter: RoleId[] = ['bloodWizard', 'vampire', 'hunter', 'doctor', 'villager', 'villager'];
    let state = startNightWithRoles(withHunter);
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p2' }, T0);

    expect(state.night.blocked).not.toContain('p2');
    expect(privateKeys(state, 'p2')).toContain('seal_failed_hunter');
    expect(privateKeys(state, 'p0')).not.toContain('seal_failed_hunter');
  });

  it('iki kez kullanılabilir, aynı kişiye de olur', () => {
    let state = startNightWithRoles(roles);
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p2' }, T0);
    expect(player(state, 'p0').usesLeft).toBe(1);
    state = skipNight(state);
    state = quietDay(state);
    expect(state.nightStep).toBe('bloodWizard');
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p2' }, T0);
    expect(player(state, 'p0').usesLeft).toBe(0);
    expect(state.night.blocked).toContain('p2');
  });
});

describe('sisler vampiri', () => {
  const roles: RoleId[] = ['mistVampire', 'vampire', 'seer', 'detective', 'villager', 'villager'];

  it('sis bilgi rollerini kapatır', () => {
    let state = startNightWithRoles(roles);
    expect(state.nightStep).toBe('mist');
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p0' }, T0);

    expect(state.night.fog).toBe(true);
    expect(eligibleActors(state, 'seer')).toEqual([]);
    expect(eligibleActors(state, 'detective')).toEqual([]);
  });

  it('kullandıktan sonra 2 gece bekler', () => {
    let state = startNightWithRoles(roles);
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p0' }, T0);
    expect(state.mistReadyRound).toBe(4); // 1. gecede kullandı → en erken 4. gece

    state = skipNight(state);
    state = quietDay(state); // gece 2
    expect(eligibleActors(state, 'mist')).toEqual([]);
    state = skipNight(state);
    state = quietDay(state); // gece 3
    expect(eligibleActors(state, 'mist')).toEqual([]);
    state = skipNight(state);
    state = quietDay(state); // gece 4
    expect(state.round).toBe(4);
    expect(eligibleActors(state, 'mist')).toContain('p0');
  });
});

describe('dedektif', () => {
  const roles: RoleId[] = ['vampire', 'detective', 'seer', 'doctor', 'villager', 'villager'];

  it('seçim yapan oyuncu için "uyandı" der', () => {
    let state = startNightWithRoles(roles);
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p4' }, T0); // vampir oynadı
    state = skipToStep(state, 'detective');
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p0' }, T0);

    expect(state.detectiveResults['p1']?.[0]).toMatchObject({ targetId: 'p0', woke: true });
  });

  it('pas geçen ve engellenen "uyanmadı" görünür', () => {
    const withSeal: RoleId[] = ['bloodWizard', 'detective', 'seer', 'doctor', 'villager', 'villager'];
    let state = startNightWithRoles(withSeal);
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p2' }, T0); // kâhin mühürlendi
    state = skipToStep(state, 'detective');
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p2' }, T0);

    expect(state.detectiveResults['p1']?.[0]).toMatchObject({ targetId: 'p2', woke: false });
  });
});

describe('büyücü', () => {
  const roles: RoleId[] = ['vampire', 'wizard', 'seer', 'doctor', 'villager', 'villager'];

  function toDay(state = startNightWithRoles(roles)) {
    let s = skipNight(state);
    return reduce(s, { type: 'TIMEOUT' }, T0); // NIGHT_RESULT → DAY
  }

  it('büyü yapılınca oylama açılmaz, doğrudan geceye geçilir', () => {
    let state = toDay();
    expect(state.phase).toBe('DAY_DISCUSSION');
    state = reduce(state, { type: 'CAST_SPELL', playerId: 'p1', targetId: 'p2' }, T0);
    expect(state.spellCastThisDay).toBe(true);
    expect(narrationKeys(state)).toContain('spell_cast');

    state = reduce(state, { type: 'END_DISCUSSION' }, T0);
    expect(state.phase).toBe('NIGHT');
    expect(narrationKeys(state)).toContain('spell_no_vote');
  });

  it('tartışmaya ek süre verir', () => {
    let state = toDay();
    const before = state.phaseEndsAt!;
    state = reduce(state, { type: 'CAST_SPELL', playerId: 'p1', targetId: 'p2' }, T0);
    expect(state.phaseEndsAt! - before).toBe(state.settings.spellBonusSeconds * 1000);
  });

  it('seçilen oyuncu o gece uyanamaz', () => {
    let state = toDay();
    state = reduce(state, { type: 'CAST_SPELL', playerId: 'p1', targetId: 'p2' }, T0);
    state = reduce(state, { type: 'END_DISCUSSION' }, T0);
    expect(state.night.blocked).toContain('p2');
    expect(eligibleActors(state, 'seer')).not.toContain('p2');
  });

  it('yalnız bir kez yapılabilir', () => {
    let state = toDay();
    state = reduce(state, { type: 'CAST_SPELL', playerId: 'p1', targetId: 'p2' }, T0);
    expect(player(state, 'p1').usesLeft).toBe(0);
    state = reduce(state, { type: 'END_DISCUSSION' }, T0);
    state = skipNight(state);
    state = reduce(state, { type: 'TIMEOUT' }, T0);
    const before = state.phaseEndsAt;
    state = reduce(state, { type: 'CAST_SPELL', playerId: 'p1', targetId: 'p2' }, T0);
    expect(state.spellCastThisDay).toBe(false);
    expect(state.phaseEndsAt).toBe(before);
  });
});

describe('hırsız', () => {
  const roles: RoleId[] = ['vampire', 'thief', 'seer', 'doctor', 'villager', 'villager'];

  it('rolü çalar, kurban düz köylü olur', () => {
    let state = startNightWithRoles(roles);
    state = skipToStep(state, 'thief');
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p2' }, T0);

    expect(player(state, 'p1').role).toBe('seer');
    expect(player(state, 'p2').role).toBe('villager');
    expect(privateKeys(state, 'p1')).toContain('stole_role_self');
    expect(privateKeys(state, 'p2')).toContain('role_stolen_self');
  });

  it('vampir rolü çalarsa takım değişir', () => {
    let state = startNightWithRoles(roles);
    state = skipToStep(state, 'thief');
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p0' }, T0);

    expect(player(state, 'p1').role).toBe('vampire');
    expect(player(state, 'p0').role).toBe('villager');
  });

  it('çalınan rol TAM hakla devralınır', () => {
    const withLord: RoleId[] = ['vampireLord', 'thief', 'seer', 'doctor', 'villager', 'villager'];
    let state = startNightWithRoles(withLord);
    // Lord tek dönüştürme hakkını kullanır
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p4' }, T0);
    expect(player(state, 'p0').usesLeft).toBe(0);

    state = skipToStep(state, 'thief');
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p0' }, T0);

    expect(player(state, 'p1').role).toBe('vampireLord');
    expect(player(state, 'p1').usesLeft).toBe(1); // sıfırdan başlar
  });

  it('yalnız bir kez çalar', () => {
    let state = startNightWithRoles(roles);
    state = skipToStep(state, 'thief');
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p3' }, T0);
    state = skipNight(state);
    state = quietDay(state);
    // Artık hırsız değil (doktor oldu) → hırsız adımı yok
    expect(eligibleActors(state, 'thief')).toEqual([]);
  });
});

describe('oylama', () => {
  it('çoğunluk asılır ama rolü açıklanmaz', () => {
    let state = startNightWithRoles(TINY);
    state = skipNight(state);
    state = reduce(state, { type: 'TIMEOUT' }, T0);
    state = reduce(state, { type: 'END_DISCUSSION' }, T0);
    state = apply(state, [
      { type: 'VOTE', playerId: 'p0', targetId: 'p3' },
      { type: 'VOTE', playerId: 'p1', targetId: 'p3' },
      { type: 'VOTE', playerId: 'p2', targetId: 'p3' },
      { type: 'VOTE', playerId: 'p3', targetId: 'abstain' },
    ]);
    expect(player(state, 'p3').alive).toBe(false);
    const event = state.log.find((e) => e.key === 'vote_hanged');
    expect(event?.params?.name).toBe('P3');
    expect(event?.params?.roleKey).toBeUndefined();
  });

  it('eşitlikte kimse asılmaz', () => {
    let state = startNightWithRoles(TINY);
    state = skipNight(state);
    state = reduce(state, { type: 'TIMEOUT' }, T0);
    state = reduce(state, { type: 'END_DISCUSSION' }, T0);
    state = apply(state, [
      { type: 'VOTE', playerId: 'p0', targetId: 'p3' },
      { type: 'VOTE', playerId: 'p1', targetId: 'p3' },
      { type: 'VOTE', playerId: 'p2', targetId: 'p1' },
      { type: 'VOTE', playerId: 'p3', targetId: 'p1' },
    ]);
    expect(state.players.filter((p) => !p.alive)).toHaveLength(0);
    expect(narrationKeys(state)).toContain('vote_tie');
  });
});

describe('kazanma koşulları', () => {
  it('vampir kalmayınca köy kazanır', () => {
    let state = startNightWithRoles(TINY);
    state = skipNight(state);
    state = reduce(state, { type: 'TIMEOUT' }, T0);
    state = reduce(state, { type: 'END_DISCUSSION' }, T0);
    state = apply(state, [
      { type: 'VOTE', playerId: 'p0', targetId: 'p0' },
      { type: 'VOTE', playerId: 'p1', targetId: 'p0' },
      { type: 'VOTE', playerId: 'p2', targetId: 'p0' },
      { type: 'VOTE', playerId: 'p3', targetId: 'p0' },
    ]);
    state = reduce(state, { type: 'TIMEOUT' }, T0);
    expect(state.winner).toBe('village');
  });

  it('vampir sayısı diğerlerine eşitlenince vampirler kazanır', () => {
    const roles: RoleId[] = ['vampire', 'seer', 'doctor', 'villager'];
    let state = startNightWithRoles(roles);
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p3' }, T0);
    state = skipNight(state);
    state = quietDay(state);
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p1' }, T0);
    state = skipNight(state);
    state = reduce(state, { type: 'TIMEOUT' }, T0);
    expect(state.winner).toBe('vampire');
  });

  it('tarafsız hırsız köy tarafında sayılmaz ama vampir de değildir', () => {
    const state = startNightWithRoles(['vampire', 'thief', 'seer', 'villager']);
    expect(checkWinner(state)).toBeNull();
  });
});

describe('başlangıç durumu', () => {
  it('boş oyun LOBBY fazındadır', () => {
    const state = createInitialState(1);
    expect(state.phase).toBe('LOBBY');
    expect(state.nightStep).toBeNull();
    expect(state.winner).toBeNull();
  });
});

describe('hırsız — çalınan rolün notları', () => {
  it('kâhin çalınınca notlar kimseye kalmaz', () => {
    // p0 hırsız, p1 kâhin. Kâhin 1. gece sorgu yapar, hırsız rolü çalar.
    let state = startNightWithRoles(['thief', 'seer', 'doctor', 'vampire', 'villager', 'hunter']);
    state = skipToStep(state, 'seer');
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p1', targetId: 'p3' }, T0);
    expect(state.seerResults['p1']).toHaveLength(1);

    state = skipToStep(state, 'thief');
    state = reduce(state, { type: 'NIGHT_ACTION', playerId: 'p0', targetId: 'p1' }, T0);

    expect(player(state, 'p0').role).toBe('seer');
    expect(player(state, 'p1').role).toBe('villager');
    // Not ne hırsıza geçer ne de kurbanda görünür (03-roles.md).
    expect(state.seerResults['p0'] ?? []).toHaveLength(0);
    expect(buildPlayerView(state, 'ROOM', 'p0').seerResults).toHaveLength(0);
    expect(buildPlayerView(state, 'ROOM', 'p1').seerResults).toHaveLength(0);
  });
});

describe('rol katmanları (web / uygulama / premium)', () => {
  it('dar rol setinde öneri yine dengeli kurulur', () => {
    const web = rolesForTiers(['core']);
    for (let n = 4; n <= 16; n++) {
      const roles = suggestedRoles(n, web);
      expect(roles, `n=${n}`).toHaveLength(n);
      // Yalnız açık roller kullanılmalı
      expect(roles.every((r) => web.includes(r)), `n=${n}`).toBe(true);
      // Vampirler her sayıda azınlıkta kalmalı
      const vampires = roles.filter(isVampireRole).length;
      expect(vampires, `n=${n}`).toBeGreaterThanOrEqual(1);
      expect(vampires, `n=${n}`).toBeLessThan(n - vampires);
    }
  });

  it('kilitli rol öneriye girmez, kilitli set genişleyince girer', () => {
    const web = rolesForTiers(['core']);
    expect(suggestedRoles(12, web)).not.toContain('detective');
    expect(suggestedRoles(12, rolesForTiers(['core', 'app', 'premium']))).toContain('detective');
  });

  it('kurucu kilitli rol koyamaz', () => {
    const web = rolesForTiers(['core']);
    const setup: RoleId[] = ['vampire', 'seer', 'doctor', 'detective'];
    expect(validateRoleSetup(setup, 4, web)).toEqual({ key: 'lockedRole' });
    expect(validateRoleSetup(['vampire', 'seer', 'doctor', 'villager'], 4, web)).toBeNull();
  });

  it('katman haritası 11 rolün tamamını kapsar', () => {
    const all = rolesForTiers(['core', 'app', 'premium']);
    expect(all).toHaveLength(11);
  });
});

describe('bir oyunluk premium bitince havuz daralıyor', () => {
  /**
   * Gerçek cihazda çıktı (10 Eylül 2026): ödüllü reklam izlendi, roller
   * açıldı, oyun oynandı — ve oyun bitip lobiye dönünce roller AÇIK kaldı.
   * `clearOneGamePremium()` tanımlıydı ama hiçbir yerden çağrılmıyordu.
   *
   * Buradaki iki test, düzeltmenin işe yaramasını engelleyecek iki tuzağı
   * kilitliyor. İkisi de motor davranışı; mağazayı hiç bilmiyorlar.
   */

  const PREMIUM: RoleId = 'wizard';
  const TEMEL: RoleId[] = ['villager', 'vampire', 'seer', 'doctor'];

  it('UPDATE_SETTINGS lobinin DIŞINDA yok sayılır', () => {
    // Havuzu daraltmayı sonuç ekranındayken denemek sessizce hiçbir şey
    // yapmıyor. Bu yüzden gameStore önce RESTART atıp lobiye dönüyor,
    // havuzu ondan SONRA tazeliyor. Sıra bozulursa ödül hiç bitmez.
    let s = seatPlayers(4);
    s = apply(s, [
      { type: 'UPDATE_SETTINGS', settings: { allowedRoles: [...TEMEL, PREMIUM] } },
      { type: 'START_GAME' },
    ]);
    expect(s.phase, 'oyun başladı').not.toBe('LOBBY');

    const daraltilmis = reduce(s, {
      type: 'UPDATE_SETTINGS',
      settings: { allowedRoles: TEMEL },
    });
    expect(daraltilmis.settings.allowedRoles, 'lobi dışında yok sayıldı').toContain(PREMIUM);

    // Lobiye dönünce aynı ayar geçiyor.
    const lobide = reduce(reduce(s, { type: 'RESTART' }), {
      type: 'UPDATE_SETTINGS',
      settings: { allowedRoles: TEMEL },
    });
    expect(lobide.settings.allowedRoles, 'lobide geçti').not.toContain(PREMIUM);
  });

  it('havuz daralınca kilitli rol içeren kurulum oyunu başlatmaz', () => {
    // Ödül bitti ama kurucunun seçtiği listede hâlâ Büyücü duruyor.
    // START_GAME `lockedRole` ile reddediyor: düğmeye basılıyor, hiçbir
    // şey olmuyor. gameStore bu yüzden kurulumu da sıfırlıyor.
    let s = seatPlayers(4);
    s = apply(s, [
      {
        type: 'UPDATE_SETTINGS',
        settings: { allowedRoles: TEMEL, roleSetup: ['vampire', 'seer', 'doctor', PREMIUM] },
      },
      { type: 'START_GAME' },
    ]);
    expect(s.phase, 'kilitli rol yüzünden başlamadı').toBe('LOBBY');

    // Kurulumu sıfırlamak motoru havuzdan öneri üretmeye zorluyor.
    s = apply(s, [
      { type: 'UPDATE_SETTINGS', settings: { roleSetup: [] } },
      { type: 'START_GAME' },
    ]);
    expect(s.phase, 'sıfırlanınca başladı').not.toBe('LOBBY');
    expect(
      s.players.every((p) => TEMEL.includes(p.role!)),
      'dağıtılan roller havuzun içinden',
    ).toBe(true);
  });
});
