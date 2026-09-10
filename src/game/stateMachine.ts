import type {
  GameAction,
  GameSettings,
  GameState,
  NarrationEvent,
  NightStep,
  Phase,
  Player,
  PlayerId,
  RoleId,
} from './types';
import { NIGHT_ORDER } from './types';
import { ROLES, initialUses, nightActionFor } from './roles';
import {
  alivePlayers,
  aliveVampires,
  aliveWithRole,
  isVampire,
  playerById,
} from './roles/helpers';
import { MIN_PLAYERS, isSupportedPlayerCount, suggestedRoles, validateRoleSetup } from './distribution';
import { createSeed, pick, shuffle } from './rng';

export const DEFAULT_SETTINGS: GameSettings = {
  discussionSeconds: 180,
  nightStepSeconds: 30,
  voteSeconds: 45,
  roleRevealSeconds: 60,
  resultSeconds: 8,
  spellBonusSeconds: 60,
  maxPlayers: 12,
  hostPlays: true,
  roleSetup: [],
  forcedRoles: {},
};

function emptyNight(): GameState['night'] {
  return {
    vampireVotes: {},
    protectedId: null,
    blocked: [],
    fog: false,
    woke: [],
    acted: [],
    choices: {},
    tentative: {},
    attackTarget: null,
    convertedTonight: null,
  };
}

export function createInitialState(seed: number = createSeed()): GameState {
  return {
    phase: 'LOBBY',
    round: 0,
    nightStep: null,
    players: [],
    settings: { ...DEFAULT_SETTINGS },
    night: emptyNight(),
    lastProtected: {},
    seerResults: {},
    detectiveResults: {},
    mistReadyRound: 1,
    spellCastThisDay: false,
    spellBlockTarget: null,
    votes: {},
    deaths: [],
    log: [],
    phaseEndsAt: null,
    winner: null,
    seed,
  };
}

// ---------------------------------------------------------------- yardımcılar

function clone(state: GameState): GameState {
  return structuredClone(state);
}

function narrate(
  state: GameState,
  key: string,
  now: number,
  params?: NarrationEvent['params'],
  onlyFor?: PlayerId[],
): void {
  state.log.push({ key, params, round: state.round, at: now, onlyFor });
}

export function participants(state: GameState): Player[] {
  return state.players.filter((p) => p.isPlayer && !p.left);
}

function setPhase(state: GameState, phase: Phase, now: number, seconds: number | null): void {
  state.phase = phase;
  state.phaseEndsAt = seconds === null ? null : now + seconds * 1000;
}

export function checkWinner(state: GameState): 'village' | 'vampire' | null {
  const alive = alivePlayers(state);
  const vampires = alive.filter(isVampire).length;
  const others = alive.length - vampires;
  if (vampires === 0) return 'village';
  if (vampires >= others) return 'vampire';
  return null;
}

function endGame(state: GameState, winner: 'village' | 'vampire', now: number): void {
  state.winner = winner;
  state.nightStep = null;
  setPhase(state, 'GAME_END', now, null);
  narrate(state, winner === 'village' ? 'win_village' : 'win_vampires', now);
}

function finishIfWon(state: GameState, now: number): boolean {
  const winner = checkWinner(state);
  if (!winner) return false;
  endGame(state, winner, now);
  return true;
}

function usesLeftOf(player: Player | undefined): number {
  if (!player?.role) return 0;
  const max = ROLES[player.role].maxUses;
  if (max === undefined) return Infinity;
  return player.usesLeft ?? 0;
}

function consumeUse(player: Player): void {
  if (player.role && ROLES[player.role].maxUses !== undefined) {
    player.usesLeft = Math.max(0, (player.usesLeft ?? 0) - 1);
  }
}

function isBlocked(state: GameState, playerId: PlayerId): boolean {
  return state.night.blocked.includes(playerId);
}

/** Bu adımda oynayabilecek oyuncular (ölü/engelli/hakkı biten hariç). */
export function eligibleActors(state: GameState, step: NightStep): PlayerId[] {
  const usable = (p: Player) => p.alive && !p.left && !isBlocked(state, p.id);

  switch (step) {
    case 'lord':
      return aliveWithRole(state, 'vampireLord')
        .filter((p) => usable(p) && usesLeftOf(p) > 0)
        .map((p) => p.id);
    case 'bloodWizard':
      return aliveWithRole(state, 'bloodWizard')
        .filter((p) => usable(p) && usesLeftOf(p) > 0)
        .map((p) => p.id);
    case 'mist':
      return state.round >= state.mistReadyRound
        ? aliveWithRole(state, 'mistVampire').filter(usable).map((p) => p.id)
        : [];
    case 'vampireVote':
      return aliveVampires(state)
        .filter((p) => usable(p) && p.id !== state.night.convertedTonight)
        .map((p) => p.id);
    case 'doctor':
      return aliveWithRole(state, 'doctor')
        .filter((p) => usable(p) && usesLeftOf(p) > 0)
        .map((p) => p.id);
    case 'seer':
      return state.night.fog
        ? []
        : aliveWithRole(state, 'seer').filter(usable).map((p) => p.id);
    case 'detective':
      return state.night.fog
        ? []
        : aliveWithRole(state, 'detective').filter(usable).map((p) => p.id);
    case 'thief':
      return aliveWithRole(state, 'thief')
        .filter((p) => usable(p) && usesLeftOf(p) > 0)
        .map((p) => p.id);
    default:
      return [];
  }
}

/** Bu oyuncu bu adımı tamamladı mı (seçim ya da pas)? */
function hasActed(state: GameState, playerId: PlayerId, step: NightStep): boolean {
  return state.night.acted.includes(`${playerId}:${step}`);
}

/** Adımda beklenen herkes kararını verdi mi? */
function stepComplete(state: GameState, step: NightStep): boolean {
  return eligibleActors(state, step).every((id) => hasActed(state, id, step));
}

// ------------------------------------------------------------- faz geçişleri

function beginStep(state: GameState, step: NightStep, now: number): void {
  state.nightStep = step;
  setPhase(state, 'NIGHT', now, state.settings.nightStepSeconds);
}

/** Sıradaki oynanabilir adıma geçer; kalmadıysa geceyi çözer. */
function advanceNight(state: GameState, now: number): void {
  const current = state.nightStep;
  const startIndex = current ? NIGHT_ORDER.indexOf(current) + 1 : 0;
  for (let i = startIndex; i < NIGHT_ORDER.length; i++) {
    const step = NIGHT_ORDER[i];
    if (eligibleActors(state, step).length > 0) {
      beginStep(state, step, now);
      return;
    }
  }
  resolveNight(state, now);
}

function startNight(state: GameState, now: number): void {
  state.round += 1;
  state.night = emptyNight();
  state.votes = {};
  state.spellCastThisDay = false;

  // Büyücünün gündüz seçtiği hedef bu gece uyanamaz.
  if (state.spellBlockTarget) {
    state.night.blocked.push(state.spellBlockTarget);
    state.spellBlockTarget = null;
  }

  narrate(state, 'night_start', now);
  state.nightStep = null;
  advanceNight(state, now);
}

function startDay(state: GameState, now: number): void {
  state.nightStep = null;
  setPhase(state, 'DAY_DISCUSSION', now, state.settings.discussionSeconds);
  narrate(state, 'day_start', now);
}

function startVote(state: GameState, now: number): void {
  state.votes = {};
  setPhase(state, 'VOTE', now, state.settings.voteSeconds);
  narrate(state, 'vote_start', now);
}

/** Gündüz bitti: büyü yapıldıysa oylama açılmaz, doğrudan geceye geçilir. */
function leaveDiscussion(state: GameState, now: number): void {
  if (state.spellCastThisDay) {
    narrate(state, 'spell_no_vote', now);
    startNight(state, now);
    return;
  }
  startVote(state, now);
}

// ------------------------------------------------------------- gece etkileri

/** Avcıya saldırı geri teper: rastgele bir vampir gizlice köylü olur. */
function hunterBackfire(state: GameState, now: number): void {
  const vampires = aliveVampires(state);
  if (vampires.length === 0) return; // dönüştürülecek vampir yok, saldırı boşa gider
  const [victim, seed] = pick(vampires, state.seed);
  state.seed = seed;
  const player = playerById(state, victim.id);
  if (!player) return;
  player.role = 'villager';
  player.usesLeft = undefined;
  // Dönüşüm GİZLİ: yalnız dönüşen oyuncuya bildirilir.
  narrate(state, 'hunter_backfire_self', now, undefined, [player.id]);
}

function applyConvert(state: GameState, targetId: PlayerId, now: number): void {
  const target = playerById(state, targetId);
  if (!target) return;

  if (target.role === 'hunter') {
    hunterBackfire(state, now);
    return;
  }

  target.role = 'vampire';
  target.usesLeft = undefined;
  state.night.convertedTonight = targetId;
  narrate(state, 'converted_self', now, undefined, [targetId]);
}

function applyBlock(state: GameState, targetId: PlayerId, now: number): void {
  const target = playerById(state, targetId);
  if (!target) return;
  if (target.role === 'hunter') {
    // Mühür işlemez; avcı uyarılır.
    narrate(state, 'seal_failed_hunter', now, undefined, [targetId]);
    return;
  }
  if (!state.night.blocked.includes(targetId)) state.night.blocked.push(targetId);
}

function applySteal(state: GameState, actorId: PlayerId, targetId: PlayerId, now: number): void {
  const actor = playerById(state, actorId);
  const target = playerById(state, targetId);
  if (!actor || !target || !target.role) return;

  const stolen = target.role;
  actor.role = stolen;
  // Rol TAM hakla devralınır: kurban hakkını tüketmişse çalmanın anlamı
  // kalmazdı (ör. lord tek dönüştürmesini kullanmış olabilir).
  actor.usesLeft = initialUses(stolen);
  target.role = 'villager';
  target.usesLeft = undefined;

  narrate(state, 'stole_role_self', now, { roleKey: stolen }, [actorId]);
  narrate(state, 'role_stolen_self', now, undefined, [targetId]);
}

function resolveVampireVote(state: GameState): void {
  const tally = new Map<PlayerId, number>();
  for (const [, target] of Object.entries(state.night.vampireVotes)) {
    tally.set(target, (tally.get(target) ?? 0) + 1);
  }
  if (tally.size === 0) return;

  const max = Math.max(...tally.values());
  const tied = [...tally.entries()].filter(([, n]) => n === max).map(([id]) => id);
  if (tied.length === 1) {
    state.night.attackTarget = tied[0];
    return;
  }
  const [chosen, seed] = pick(tied, state.seed);
  state.seed = seed;
  state.night.attackTarget = chosen;
}

/** Gece sonu: ölüm çözümlenir (doktor koruması bu aşamada işler). */
function resolveNight(state: GameState, now: number): void {
  resolveVampireVote(state);
  const targetId = state.night.attackTarget;
  const target = targetId ? playerById(state, targetId) : null;

  if (!target) {
    narrate(state, 'no_death', now);
  } else if (target.role === 'hunter') {
    // Saldırı geri teper: kimse ölmez, gizlice bir vampir köylü olur.
    hunterBackfire(state, now);
    narrate(state, 'no_death', now);
  } else if (state.night.protectedId === target.id) {
    narrate(state, 'night_saved', now);
  } else {
    target.alive = false;
    target.deathCause = 'vampire';
    target.deathRound = state.round;
    state.deaths.push({ playerId: target.id, cause: 'vampire', round: state.round });
    narrate(state, 'night_death', now, { name: target.name });
  }

  state.nightStep = null;
  setPhase(state, 'NIGHT_RESULT', now, state.settings.resultSeconds);
}

function resolveVote(state: GameState, now: number): void {
  const tally = new Map<PlayerId, number>();
  for (const voter of alivePlayers(state)) {
    const choice = state.votes[voter.id];
    if (!choice || choice === 'abstain') continue;
    tally.set(choice, (tally.get(choice) ?? 0) + 1);
  }

  if (tally.size === 0) {
    narrate(state, 'vote_none', now);
    setPhase(state, 'VOTE_RESULT', now, state.settings.resultSeconds);
    return;
  }

  const max = Math.max(...tally.values());
  const tied = [...tally.entries()].filter(([, n]) => n === max).map(([id]) => id);
  if (tied.length > 1) {
    narrate(state, 'vote_tie', now);
    setPhase(state, 'VOTE_RESULT', now, state.settings.resultSeconds);
    return;
  }

  const hanged = playerById(state, tied[0]);
  if (hanged) {
    hanged.alive = false;
    hanged.deathCause = 'hanging';
    hanged.deathRound = state.round;
    state.deaths.push({ playerId: hanged.id, cause: 'hanging', round: state.round });
    // Rol açıklanmaz (kullanıcı kararı).
    narrate(state, 'vote_hanged', now, { name: hanged.name });
  }
  setPhase(state, 'VOTE_RESULT', now, state.settings.resultSeconds);
}

function leaveResultPhase(state: GameState, now: number): void {
  if (finishIfWon(state, now)) return;
  if (state.phase === 'NIGHT_RESULT') startDay(state, now);
  else startNight(state, now);
}

// ------------------------------------------------------------------ reducer

export function reduce(state: GameState, action: GameAction, now: number = Date.now()): GameState {
  const s = clone(state);

  switch (action.type) {
    case 'ADD_PLAYER': {
      const existing = playerById(s, action.player.id);
      if (existing) {
        existing.connected = true;
        existing.left = false;
        existing.name = action.player.name;
        return s;
      }
      if (s.phase !== 'LOBBY') return s;
      if (s.players.filter((p) => !p.left).length >= s.settings.maxPlayers) return s;
      s.players.push({ ...action.player, alive: true, left: false, ready: false });
      return s;
    }

    case 'SET_NAME': {
      const player = playerById(s, action.playerId);
      if (player) player.name = action.name;
      return s;
    }

    case 'SET_READY': {
      const player = playerById(s, action.playerId);
      if (player && s.phase === 'LOBBY') player.ready = action.ready;
      return s;
    }

    case 'SET_CONNECTED': {
      const player = playerById(s, action.playerId);
      if (player) player.connected = action.connected;
      return s;
    }

    case 'UPDATE_SETTINGS': {
      if (s.phase !== 'LOBBY') return s;
      s.settings = { ...s.settings, ...action.settings };
      const host = s.players.find((p) => p.isHost);
      if (host) host.isPlayer = s.settings.hostPlays;
      return s;
    }

    case 'KICK_PLAYER': {
      if (s.phase !== 'LOBBY') return s;
      s.players = s.players.filter((p) => p.id !== action.playerId);
      return s;
    }

    case 'START_GAME': {
      if (s.phase !== 'LOBBY') return s;
      const host = s.players.find((p) => p.isHost);
      if (host) host.isPlayer = s.settings.hostPlays;
      const playing = s.players.filter((p) => p.isPlayer && !p.left);
      if (!isSupportedPlayerCount(playing.length)) return s;

      // Kurucu rol seçtiyse SAYI TUTMAK ZORUNDA.
      //
      // Önceden tutmayınca sessizce öneriye düşülüyordu: 5 oyunculuk masaya
      // 9 rol seçen kurucu, Hırsız/Dedektif/Avcı seçtiğini sanıp motorun
      // ürettiği bambaşka bir dağılımla oynuyordu. Hiçbir uyarı yoktu.
      //
      // Öneri artık YALNIZ hiç seçim yapılmadığında (varsayılan yol)
      // devreye giriyor.
      if (s.settings.roleSetup.length > 0 && s.settings.roleSetup.length !== playing.length) {
        return s;
      }
      const setup =
        s.settings.roleSetup.length === playing.length
          ? s.settings.roleSetup
          : suggestedRoles(playing.length, s.settings.allowedRoles);
      if (validateRoleSetup(setup, playing.length, s.settings.allowedRoles)) return s;

      // TEST ARACI: sabitlenmiş roller havuzdan düşülür, kalanı karışır.
      const forced = s.settings.forcedRoles ?? {};
      const pool = [...setup];
      const fixed = new Map<PlayerId, RoleId>();
      for (const p of playing) {
        const wanted = forced[p.id];
        if (!wanted) continue;
        const index = pool.indexOf(wanted);
        if (index !== -1) pool.splice(index, 1);
        else pool.pop(); // havuzda yoksa birini feda et
        fixed.set(p.id, wanted);
      }

      const [roles, seed] = shuffle(pool, s.seed);
      s.seed = seed;
      let next = 0;
      playing.forEach((p) => {
        const role = fixed.get(p.id) ?? roles[next++];
        p.role = role;
        p.usesLeft = initialUses(role);
        p.alive = true;
        p.ready = false;
        delete p.deathCause;
        delete p.deathRound;
      });

      s.deaths = [];
      s.log = [];
      s.seerResults = {};
      s.detectiveResults = {};
      s.lastProtected = {};
      s.votes = {};
      s.round = 0;
      s.mistReadyRound = 1;
      s.spellCastThisDay = false;
      s.spellBlockTarget = null;
      s.winner = null;
      narrate(s, 'game_start', now);
      setPhase(s, 'ROLE_REVEAL', now, s.settings.roleRevealSeconds);
      return s;
    }

    case 'ROLE_SEEN': {
      if (s.phase !== 'ROLE_REVEAL') return s;
      const player = playerById(s, action.playerId);
      if (!player || !player.isPlayer) return s;
      player.ready = true;
      if (participants(s).every((p) => p.ready)) startNight(s, now);
      return s;
    }

    /**
     * Onaylamadan önce "şu an buna dokunuyorum" bilgisi. Aynı adımı
     * oynayanlar birbirini görsün diye var; oyunun sonucuna hiç etkisi
     * yok, yalnız görünürlük.
     */
    case 'NIGHT_PREVIEW': {
      if (s.phase !== 'NIGHT' || !s.nightStep) return s;
      const step = s.nightStep;
      const actor = playerById(s, action.playerId);
      if (!actor || !actor.role) return s;
      if (!eligibleActors(s, step).includes(actor.id)) return s;
      // Onayladıktan sonra fikir değiştiremez; geçici seçim de yazılmamalı.
      if (hasActed(s, actor.id, step)) return s;

      const key = `${actor.id}:${step}`;
      if (action.targetId === null) delete s.night.tentative[key];
      else s.night.tentative[key] = action.targetId;
      return s;
    }

    case 'NIGHT_ACTION': {
      if (s.phase !== 'NIGHT' || !s.nightStep) return s;
      const step = s.nightStep;
      const actor = playerById(s, action.playerId);
      if (!actor || !actor.role) return s;
      if (!eligibleActors(s, step).includes(actor.id)) return s;
      if (hasActed(s, actor.id, step)) return s;

      // Pas: uyanmış sayılmaz (dedektif "uyanmadı" görür).
      if (action.targetId === null) {
        s.night.acted.push(`${actor.id}:${step}`);
        s.night.choices[`${actor.id}:${step}`] = null;
        delete s.night.tentative[`${actor.id}:${step}`];
        if (step === 'vampireVote') s.night.vampireVotes[actor.id] = '';
        if (stepComplete(s, step)) advanceNight(s, now);
        return s;
      }

      const nightAction = nightActionFor(actor.role, step);
      if (!nightAction) return s;
      if (!nightAction.validTargets(s, actor.id).includes(action.targetId)) return s;

      s.night.woke.push(actor.id);
      s.night.acted.push(`${actor.id}:${step}`);
      s.night.choices[`${actor.id}:${step}`] = action.targetId;
      delete s.night.tentative[`${actor.id}:${step}`];

      // Oyuncu ne yaptığını görebilmeli. Yalnız kendisine gider ve sonucu
      // ele vermez (ör. mühür tuttu mu bilgisi kurala göre verilmez).
      const targetName = playerById(s, action.targetId)?.name;
      const CONFIRM: Partial<Record<NightStep, string>> = {
        vampireVote: 'acted_vampire_self',
        doctor: 'acted_protect_self',
        // Kâhin ve dedektif bu listede yoktu: okuma/soruşturma yaptıklarında
        // hiçbir onay görmüyorlardı. Sonuç zaten notlara düşüyor ama
        // "kaydoldu mu" sorusunun cevabı yoktu (Bengü, 27 Ağustos).
        seer: 'acted_read_self',
        detective: 'acted_investigate_self',
        bloodWizard: 'acted_seal_self',
        lord: 'acted_convert_self',
        mist: 'acted_fog_self',
      };
      const confirmKey = CONFIRM[step];
      if (confirmKey) narrate(s, confirmKey, now, { name: targetName }, [actor.id]);

      if (step === 'vampireVote') {
        s.night.vampireVotes[actor.id] = action.targetId;
      } else {
        consumeUse(actor);
        for (const effect of nightAction.resolve(s, actor.id, action.targetId)) {
          switch (effect.type) {
            case 'protect':
              s.night.protectedId = effect.targetId;
              s.lastProtected[actor.id] = effect.targetId;
              break;
            case 'block':
              applyBlock(s, effect.targetId, now);
              break;
            case 'fog':
              s.night.fog = true;
              s.mistReadyRound = s.round + 3;
              break;
            case 'convert':
              applyConvert(s, effect.targetId, now);
              break;
            case 'steal':
              applySteal(s, effect.actorId, effect.targetId, now);
              break;
            case 'reveal': {
              const list = s.seerResults[effect.actorId] ?? [];
              list.push({ round: s.round, targetId: effect.targetId, isVampire: effect.isVampire });
              s.seerResults[effect.actorId] = list;
              break;
            }
            case 'investigate': {
              const list = s.detectiveResults[effect.actorId] ?? [];
              list.push({
                round: s.round,
                targetId: effect.targetId,
                woke: s.night.woke.includes(effect.targetId),
              });
              s.detectiveResults[effect.actorId] = list;
              break;
            }
            default:
              break;
          }
        }
      }

      if (stepComplete(s, step)) advanceNight(s, now);
      return s;
    }

    case 'CAST_SPELL': {
      if (s.phase !== 'DAY_DISCUSSION' || s.spellCastThisDay) return s;
      const actor = playerById(s, action.playerId);
      if (!actor || actor.role !== 'wizard' || !actor.alive || actor.left) return s;
      if (usesLeftOf(actor) <= 0) return s;
      if (!ROLES.wizard.dayAction!.validTargets(s, actor.id).includes(action.targetId)) return s;

      consumeUse(actor);
      s.spellCastThisDay = true;
      s.spellBlockTarget = action.targetId;
      // Tartışmaya ek süre; kimin yaptığı gizli.
      if (s.phaseEndsAt !== null) s.phaseEndsAt += s.settings.spellBonusSeconds * 1000;
      narrate(s, 'spell_cast', now);
      return s;
    }

    case 'VOTE': {
      if (s.phase !== 'VOTE') return s;
      const voter = playerById(s, action.playerId);
      if (!voter || !voter.alive || voter.left) return s;
      if (voter.id in s.votes) return s;
      if (action.targetId !== 'abstain') {
        const target = playerById(s, action.targetId);
        if (!target || !target.alive || target.left) return s;
      }
      s.votes[voter.id] = action.targetId;
      if (alivePlayers(s).every((p) => p.id in s.votes)) resolveVote(s, now);
      return s;
    }

    case 'END_DISCUSSION': {
      if (s.phase !== 'DAY_DISCUSSION') return s;
      leaveDiscussion(s, now);
      return s;
    }

    case 'PLAYER_LEFT': {
      const player = playerById(s, action.playerId);
      if (!player) return s;
      if (s.phase === 'LOBBY') {
        s.players = s.players.filter((p) => p.id !== action.playerId);
        return s;
      }
      if (player.left) return s;
      player.left = true;
      player.connected = false;
      narrate(s, 'player_left', now, { name: player.name });
      delete s.night.vampireVotes[player.id];
      delete s.votes[player.id];

      if (finishIfWon(s, now)) return s;

      if (s.phase === 'NIGHT' && s.nightStep && stepComplete(s, s.nightStep)) advanceNight(s, now);
      else if (s.phase === 'VOTE' && alivePlayers(s).every((p) => p.id in s.votes)) resolveVote(s, now);
      else if (s.phase === 'ROLE_REVEAL' && participants(s).every((p) => p.ready)) startNight(s, now);
      return s;
    }

    case 'TIMEOUT': {
      switch (s.phase) {
        case 'ROLE_REVEAL':
          startNight(s, now);
          break;
        case 'NIGHT':
          // Adım süresi doldu: seçim yapmayanlar pas sayılır.
          advanceNight(s, now);
          break;
        case 'NIGHT_RESULT':
        case 'VOTE_RESULT':
          leaveResultPhase(s, now);
          break;
        case 'DAY_DISCUSSION':
          leaveDiscussion(s, now);
          break;
        case 'VOTE':
          resolveVote(s, now);
          break;
        default:
          break;
      }
      return s;
    }

    case 'RESTART': {
      const next = createInitialState(s.seed);
      next.settings = { ...s.settings };
      next.players = s.players
        .filter((p) => !p.left)
        .map((p) => ({
          ...p,
          alive: true,
          ready: false,
          role: undefined,
          usesLeft: undefined,
          deathCause: undefined,
          deathRound: undefined,
        }));
      return next;
    }

    default:
      return s;
  }
}

export { MIN_PLAYERS };

export function rolesInPlay(state: GameState): RoleId[] {
  return participants(state)
    .map((p) => p.role)
    .filter((r): r is RoleId => Boolean(r));
}
