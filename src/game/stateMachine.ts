import type {
  DeathCause,
  GameAction,
  GameSettings,
  GameState,
  NarrationEvent,
  Phase,
  Player,
  PlayerId,
  RoleId,
  StateEffect,
} from './types';
import { ROLES } from './roles';
import { alivePlayers, aliveWithRole, playerById } from './roles/helpers';
import { distributionFor, isSupportedPlayerCount, TABLE_MAX_PLAYERS } from './distribution';
import { createSeed, pick, shuffle } from './rng';

/** 02-game-flow.md'deki süreler. */
export const DEFAULT_SETTINGS: GameSettings = {
  discussionSeconds: 180,
  nightSeconds: 60,
  voteSeconds: 45,
  hunterSeconds: 30,
  roleRevealSeconds: 60,
  resultSeconds: 8,
  maxPlayers: TABLE_MAX_PLAYERS,
  hostPlays: true,
};

export function createInitialState(seed: number = createSeed()): GameState {
  return {
    phase: 'LOBBY',
    round: 0,
    players: [],
    settings: { ...DEFAULT_SETTINGS },
    night: { vampireVotes: {}, seerChecks: {}, doctorSaves: {}, passed: [] },
    lastProtected: {},
    seerResults: {},
    votes: {},
    pendingHunter: null,
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
): void {
  state.log.push({ key, params, round: state.round, at: now });
}

/** Oyuna dahil olan (host anlatıcıysa host hariç), terk etmemiş oyuncular. */
export function participants(state: GameState): Player[] {
  return state.players.filter((p) => p.isPlayer && !p.left);
}

function setPhase(state: GameState, phase: Phase, now: number, seconds: number | null): void {
  state.phase = phase;
  state.phaseEndsAt = seconds === null ? null : now + seconds * 1000;
}

export function checkWinner(state: GameState): 'village' | 'vampire' | null {
  const alive = alivePlayers(state);
  const vampires = alive.filter((p) => p.role === 'vampire').length;
  const villagers = alive.length - vampires;
  if (vampires === 0) return 'village';
  if (vampires >= villagers) return 'vampire';
  return null;
}

function endGame(state: GameState, winner: 'village' | 'vampire', now: number): void {
  state.winner = winner;
  setPhase(state, 'GAME_END', now, null);
  narrate(state, winner === 'village' ? 'win_village' : 'win_vampires', now);
}

/** Kazanan varsa oyunu bitirir; bitti mi bilgisini döndürür. */
function finishIfWon(state: GameState, now: number): boolean {
  const winner = checkWinner(state);
  if (!winner) return false;
  endGame(state, winner, now);
  return true;
}

/** Ölümleri uygular, tetiklenen `onDeath` etkilerini döndürür. */
function applyDeaths(
  state: GameState,
  kills: { targetId: PlayerId; cause: DeathCause; byPlayerId?: PlayerId }[],
  now: number,
): StateEffect[] {
  const triggered: StateEffect[] = [];
  for (const kill of kills) {
    const player = playerById(state, kill.targetId);
    if (!player || !player.alive || player.left) continue;
    player.alive = false;
    player.deathCause = kill.cause;
    player.deathRound = state.round;
    state.deaths.push({
      playerId: player.id,
      cause: kill.cause,
      round: state.round,
      byPlayerId: kill.byPlayerId,
    });
    const role = player.role ? ROLES[player.role] : undefined;
    if (role?.onDeath) triggered.push(...role.onDeath(state, player.id));
    void now;
  }
  return triggered;
}

/** Avcı tetiklendiyse son ok fazına geçer; geçilmediyse false döner. */
function enterHunterPhaseIfTriggered(
  state: GameState,
  effects: StateEffect[],
  nextPhase: Phase,
  now: number,
): boolean {
  const trigger = effects.find((e) => e.type === 'hunterTrigger');
  if (!trigger || trigger.type !== 'hunterTrigger') return false;
  const hunter = playerById(state, trigger.hunterId);
  if (!hunter) return false;
  state.pendingHunter = { hunterId: trigger.hunterId, nextPhase };
  setPhase(state, 'HUNTER_SHOT', now, state.settings.hunterSeconds);
  narrate(state, 'hunter_triggered', now, { name: hunter.name });
  return true;
}

export function hunterTargets(state: GameState): PlayerId[] {
  if (!state.pendingHunter) return [];
  return alivePlayers(state)
    .filter((p) => p.id !== state.pendingHunter!.hunterId)
    .map((p) => p.id);
}

// ------------------------------------------------------------- faz geçişleri

function startNight(state: GameState, now: number): void {
  state.round += 1;
  state.night = { vampireVotes: {}, seerChecks: {}, doctorSaves: {}, passed: [] };
  state.votes = {};
  state.pendingHunter = null;
  setPhase(state, 'NIGHT', now, state.settings.nightSeconds);
  narrate(state, 'night_start', now);
}

function startDay(state: GameState, now: number): void {
  setPhase(state, 'DAY_DISCUSSION', now, state.settings.discussionSeconds);
  narrate(state, 'day_start', now);
}

function startVote(state: GameState, now: number): void {
  state.votes = {};
  setPhase(state, 'VOTE', now, state.settings.voteSeconds);
  narrate(state, 'vote_start', now);
}

/** Gece aksiyonu olan, hâlâ hayatta olan oyuncular. */
export function expectedNightActors(state: GameState): PlayerId[] {
  return alivePlayers(state)
    .filter((p) => p.role && ROLES[p.role].nightAction)
    .map((p) => p.id);
}

export function hasSubmittedNightAction(state: GameState, playerId: PlayerId): boolean {
  if (state.night.passed.includes(playerId)) return true;
  return (
    playerId in state.night.vampireVotes ||
    playerId in state.night.seerChecks ||
    playerId in state.night.doctorSaves
  );
}

function allNightActionsIn(state: GameState): boolean {
  return expectedNightActors(state).every((id) => hasSubmittedNightAction(state, id));
}

function allVotesIn(state: GameState): boolean {
  return alivePlayers(state).every((p) => p.id in state.votes);
}

/**
 * NIGHT_RESULT çözümlemesi — 02-game-flow.md sırası:
 * 1) vampir hedefi 2) doktor koruması 3) avcı kontrolü 4) kazanma kontrolü
 */
function resolveNight(state: GameState, now: number): void {
  const effects: StateEffect[] = [];

  // 1) Vampirlerin ortak hedefi: çoğunluk, eşitlikte rastgele.
  const vampires = aliveWithRole(state, 'vampire');
  const tally = new Map<PlayerId, number>();
  for (const v of vampires) {
    const target = state.night.vampireVotes[v.id];
    if (!target) continue;
    tally.set(target, (tally.get(target) ?? 0) + 1);
  }
  let vampireTarget: PlayerId | null = null;
  if (tally.size > 0) {
    const max = Math.max(...tally.values());
    const tied = [...tally.entries()].filter(([, n]) => n === max).map(([id]) => id);
    if (tied.length === 1) {
      vampireTarget = tied[0];
    } else {
      const [chosen, seed] = pick(tied, state.seed);
      state.seed = seed;
      vampireTarget = chosen;
    }
  }
  if (vampireTarget && vampires.length > 0) {
    effects.push(...ROLES.vampire.nightAction!.resolve(state, vampires[0].id, vampireTarget));
  }

  // 2) Doktor korumaları (kâhin sonuçları seçim anında verildi).
  for (const doc of aliveWithRole(state, 'doctor')) {
    const target = state.night.doctorSaves[doc.id];
    if (target) {
      effects.push(...ROLES.doctor.nightAction!.resolve(state, doc.id, target));
      state.lastProtected[doc.id] = target;
    } else {
      delete state.lastProtected[doc.id];
    }
  }

  const protectedIds = new Set(
    effects.filter((e) => e.type === 'protect').map((e) => (e as { targetId: PlayerId }).targetId),
  );
  const attacks = effects.filter((e) => e.type === 'attack') as {
    type: 'attack';
    targetId: PlayerId;
  }[];

  const kills: { targetId: PlayerId; cause: DeathCause }[] = [];
  let savedSomeone = false;
  for (const attack of attacks) {
    if (protectedIds.has(attack.targetId)) {
      savedSomeone = true;
      continue;
    }
    kills.push({ targetId: attack.targetId, cause: 'vampire' });
  }

  const killedNames = kills
    .map((k) => playerById(state, k.targetId)?.name)
    .filter((n): n is string => Boolean(n));
  const triggered = applyDeaths(state, kills, now);

  if (killedNames.length > 0) {
    for (const name of killedNames) narrate(state, 'night_death', now, { name });
  } else if (savedSomeone) {
    narrate(state, 'night_saved', now);
  } else {
    narrate(state, 'no_death', now);
  }

  // 3) Avcı kontrolü
  if (enterHunterPhaseIfTriggered(state, triggered, 'NIGHT_RESULT', now)) return;

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

  // MVP kuralı: eşitlikte kimse asılmaz (runoff sonraki faz).
  if (tied.length > 1) {
    narrate(state, 'vote_tie', now);
    setPhase(state, 'VOTE_RESULT', now, state.settings.resultSeconds);
    return;
  }

  const hanged = playerById(state, tied[0]);
  if (!hanged) {
    setPhase(state, 'VOTE_RESULT', now, state.settings.resultSeconds);
    return;
  }
  // Rol açıklanmaz; kimlik yalnız oyun sonunda ortaya çıkar.
  narrate(state, 'vote_hanged', now, { name: hanged.name });
  const triggered = applyDeaths(state, [{ targetId: hanged.id, cause: 'hanging' }], now);

  if (enterHunterPhaseIfTriggered(state, triggered, 'VOTE_RESULT', now)) return;
  setPhase(state, 'VOTE_RESULT', now, state.settings.resultSeconds);
}

function resolveHunterShot(state: GameState, targetId: PlayerId | null, now: number): void {
  const pending = state.pendingHunter;
  if (!pending) return;
  const nextPhase = pending.nextPhase;
  state.pendingHunter = null;

  if (targetId && hunterTargets({ ...state, pendingHunter: pending }).includes(targetId)) {
    const target = playerById(state, targetId);
    if (target) {
      // Avcı kurbanının rolü açıklanmaz; yalnız asılanın rolü açıklanır.
      narrate(state, 'hunter_kill', now, { name: target.name });
      applyDeaths(state, [{ targetId, cause: 'hunter', byPlayerId: pending.hunterId }], now);
    }
  } else {
    narrate(state, 'hunter_pass', now);
  }

  setPhase(state, nextPhase, now, state.settings.resultSeconds);
}

/** Sonuç ekranından sonraki adım: kazanan var mı, yoksa devam. */
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
        // Yeniden bağlanma: kimlik korunur, durum geri verilir.
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

      const [roles, seed] = shuffle(distributionFor(playing.length), s.seed);
      s.seed = seed;
      playing.forEach((p, i) => {
        p.role = roles[i];
        p.alive = true;
        p.ready = false;
        delete p.deathCause;
        delete p.deathRound;
      });
      s.deaths = [];
      s.log = [];
      s.seerResults = {};
      s.lastProtected = {};
      s.votes = {};
      s.round = 0;
      s.winner = null;
      s.pendingHunter = null;
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

    case 'NIGHT_ACTION': {
      if (s.phase !== 'NIGHT') return s;
      const actor = playerById(s, action.playerId);
      if (!actor || !actor.alive || actor.left || !actor.role) return s;
      const role = ROLES[actor.role];
      if (!role.nightAction) return s;
      if (hasSubmittedNightAction(s, actor.id)) return s;

      if (action.targetId === null) {
        s.night.passed.push(actor.id);
      } else {
        const valid = role.nightAction.validTargets(s, actor.id);
        if (!valid.includes(action.targetId)) return s;

        switch (actor.role) {
          case 'vampire':
            s.night.vampireVotes[actor.id] = action.targetId;
            break;
          case 'doctor':
            s.night.doctorSaves[actor.id] = action.targetId;
            break;
          case 'seer': {
            s.night.seerChecks[actor.id] = action.targetId;
            // Kâhin cevabını anında alır (02-game-flow.md).
            const effects = role.nightAction.resolve(s, actor.id, action.targetId);
            for (const effect of effects) {
              if (effect.type !== 'reveal') continue;
              const list = s.seerResults[actor.id] ?? [];
              list.push({ round: s.round, targetId: effect.targetId, isVampire: effect.isVampire });
              s.seerResults[actor.id] = list;
            }
            break;
          }
          default:
            return s;
        }
      }

      if (allNightActionsIn(s)) resolveNight(s, now);
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
      if (allVotesIn(s)) resolveVote(s, now);
      return s;
    }

    case 'HUNTER_SHOT': {
      if (s.phase !== 'HUNTER_SHOT') return s;
      if (!s.pendingHunter || s.pendingHunter.hunterId !== action.playerId) return s;
      resolveHunterShot(s, action.targetId, now);
      return s;
    }

    case 'END_DISCUSSION': {
      if (s.phase !== 'DAY_DISCUSSION') return s;
      startVote(s, now);
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
      delete s.night.seerChecks[player.id];
      delete s.night.doctorSaves[player.id];
      delete s.votes[player.id];

      if (s.phase === 'HUNTER_SHOT' && s.pendingHunter?.hunterId === player.id) {
        resolveHunterShot(s, null, now);
      }
      if (finishIfWon(s, now)) return s;

      if (s.phase === 'NIGHT' && allNightActionsIn(s)) resolveNight(s, now);
      else if (s.phase === 'VOTE' && allVotesIn(s)) resolveVote(s, now);
      else if (s.phase === 'ROLE_REVEAL' && participants(s).every((p) => p.ready)) startNight(s, now);
      return s;
    }

    case 'TIMEOUT': {
      switch (s.phase) {
        case 'ROLE_REVEAL':
          startNight(s, now);
          break;
        case 'NIGHT':
          resolveNight(s, now);
          break;
        case 'NIGHT_RESULT':
        case 'VOTE_RESULT':
          leaveResultPhase(s, now);
          break;
        case 'DAY_DISCUSSION':
          startVote(s, now);
          break;
        case 'VOTE':
          resolveVote(s, now);
          break;
        case 'HUNTER_SHOT':
          resolveHunterShot(s, null, now);
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
          deathCause: undefined,
          deathRound: undefined,
        }));
      return next;
    }

    default:
      return s;
  }
}

/** Rol dağılımının doğrulaması için dışa açık yardımcı. */
export function rolesInPlay(state: GameState): RoleId[] {
  return participants(state)
    .map((p) => p.role)
    .filter((r): r is RoleId => Boolean(r));
}
