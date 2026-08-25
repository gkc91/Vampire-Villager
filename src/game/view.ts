import type {
  DeathRecord,
  DetectiveResult,
  GameSettings,
  GameState,
  NarrationEvent,
  NightStep,
  Phase,
  PlayerId,
  RoleId,
  SeerResult,
  Team,
} from './types';
import { ROLES, nightActionFor } from './roles';
import { alivePlayers, isVampire, playerById } from './roles/helpers';
import { eligibleActors } from './stateMachine';

/**
 * Oyuncuya giden filtrelenmiş görünüm. Host dışındaki hiçbir istemci ham
 * GameState görmez (01-architecture.md — host-otoriter model).
 */

export interface PublicPlayer {
  id: PlayerId;
  name: string;
  color: string;
  isHost: boolean;
  isPlayer: boolean;
  connected: boolean;
  ready: boolean;
  alive: boolean;
  left: boolean;
  isBot?: boolean;
  /** Yalnız hayalet modunda / oyun sonunda dolu. */
  role?: RoleId;
  deathRound?: number;
  hasVoted?: boolean;
}

export interface PlayerView {
  roomId: string;
  phase: Phase;
  nightStep: NightStep | null;
  round: number;
  settings: GameSettings;
  phaseEndsAt: number | null;
  winner: Team | null;
  players: PublicPlayer[];
  me: {
    id: PlayerId;
    name: string;
    role?: RoleId;
    team?: Team;
    /** Sınırlı roller için kalan hak; sınırsızsa null. */
    usesLeft: number | null;
    alive: boolean;
    left: boolean;
    isHost: boolean;
    isPlayer: boolean;
    ready: boolean;
    ghost: boolean;
  };
  /** Vampirler birbirini görür. */
  teammates: PlayerId[];
  seerResults: SeerResult[];
  detectiveResults: DetectiveResult[];
  /** Vampir oylamasında takım arkadaşlarının seçimi. */
  vampirePicks: Record<PlayerId, PlayerId>;
  nightAction: {
    /** Şu anki adım bana mı ait ve henüz oynamadım mı. */
    canAct: boolean;
    /** Hedef seçmiyorum, yalnız onaylıyorum (sis). */
    selfCast: boolean;
    validTargets: PlayerId[];
    submitted: boolean;
  };
  spell: {
    canCast: boolean;
    validTargets: PlayerId[];
    /** Bugün büyü yapıldı mı (kim yaptığı gizli). */
    castToday: boolean;
  };
  vote: {
    canVote: boolean;
    myVote: PlayerId | 'abstain' | null;
    tally: Record<PlayerId, number> | null;
  };
  deaths: DeathRecord[];
  log: NarrationEvent[];
  allRoles: Record<PlayerId, RoleId> | null;
}

export function buildPlayerView(state: GameState, roomId: string, viewerId: PlayerId): PlayerView {
  const me = playerById(state, viewerId);
  const gameOver = state.phase === 'GAME_END';
  const ghost = Boolean(me && me.isPlayer && (!me.alive || me.left)) || gameOver;
  const seeEverything = ghost;

  const players: PublicPlayer[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    isHost: p.isHost,
    isPlayer: p.isPlayer,
    connected: p.connected,
    ready: p.ready,
    alive: p.alive,
    left: p.left,
    isBot: p.isBot,
    // Roller yalnız oyun sonunda / hayalet modunda açılır (03-roles.md).
    role: seeEverything ? p.role : undefined,
    deathRound: p.deathRound,
    hasVoted: state.phase === 'VOTE' ? p.id in state.votes : undefined,
  }));

  const myRole = me?.role;
  const step = state.nightStep;

  // Adımın aksiyon tanımı role göre değişir: özel vampirler kendi
  // adımlarının yanı sıra kurban oylamasına da katılır.
  const stepAction = myRole && step ? nightActionFor(myRole, step) : undefined;
  const isMyStep =
    state.phase === 'NIGHT' &&
    step !== null &&
    eligibleActors(state, step).includes(viewerId) &&
    Boolean(stepAction);

  // Adım bazlı: lord kendi adımında oynasa bile kurban oylamasına katılır.
  const alreadyActed = step !== null && state.night.acted.includes(`${viewerId}:${step}`);

  const teammates =
    me && myRole && ROLES[myRole].knowsTeammates
      ? state.players.filter((p) => p.id !== me.id && isVampire(p)).map((p) => p.id)
      : [];

  const vampirePicks: Record<PlayerId, PlayerId> = {};
  if (myRole && ROLES[myRole].knowsTeammates && state.phase === 'NIGHT') {
    for (const [voterId, targetId] of Object.entries(state.night.vampireVotes)) {
      if (targetId) vampirePicks[voterId] = targetId;
    }
  }

  const showTally = state.phase === 'VOTE_RESULT' || gameOver || seeEverything;
  let tally: Record<PlayerId, number> | null = null;
  if (showTally && Object.keys(state.votes).length > 0) {
    tally = {};
    for (const choice of Object.values(state.votes)) {
      if (choice === 'abstain') continue;
      tally[choice] = (tally[choice] ?? 0) + 1;
    }
  }

  const allRoles: Record<PlayerId, RoleId> | null = seeEverything ? {} : null;
  if (allRoles) {
    for (const p of state.players) {
      if (p.role) allRoles[p.id] = p.role;
    }
  }

  const canCastSpell =
    state.phase === 'DAY_DISCUSSION' &&
    myRole === 'wizard' &&
    Boolean(me?.alive && !me.left) &&
    !state.spellCastThisDay &&
    (me?.usesLeft ?? 0) > 0;

  const maxUses = myRole ? ROLES[myRole].maxUses : undefined;

  return {
    roomId,
    phase: state.phase,
    nightStep: state.nightStep,
    round: state.round,
    settings: state.settings,
    phaseEndsAt: state.phaseEndsAt,
    winner: state.winner,
    players,
    me: {
      id: viewerId,
      name: me?.name ?? '',
      role: myRole,
      team: myRole ? ROLES[myRole].team : undefined,
      usesLeft: maxUses === undefined ? null : (me?.usesLeft ?? 0),
      alive: me?.alive ?? false,
      left: me?.left ?? false,
      isHost: me?.isHost ?? false,
      isPlayer: me?.isPlayer ?? false,
      ready: me?.ready ?? false,
      ghost,
    },
    teammates,
    seerResults: myRole === 'seer' ? (state.seerResults[viewerId] ?? []) : [],
    detectiveResults: myRole === 'detective' ? (state.detectiveResults[viewerId] ?? []) : [],
    vampirePicks,
    nightAction: {
      canAct: isMyStep && !alreadyActed,
      selfCast: Boolean(stepAction?.selfCast),
      validTargets:
        isMyStep && !alreadyActed && stepAction
          ? stepAction.validTargets(state, viewerId)
          : [],
      submitted: alreadyActed,
    },
    spell: {
      canCast: canCastSpell,
      validTargets: canCastSpell ? ROLES.wizard.dayAction!.validTargets(state, viewerId) : [],
      castToday: state.spellCastThisDay,
    },
    vote: {
      canVote:
        state.phase === 'VOTE' && Boolean(me?.alive && !me?.left) && !(viewerId in state.votes),
      myVote: state.votes[viewerId] ?? null,
      tally,
    },
    deaths: state.deaths,
    // Gizli anlatımlar (dönüşüm, mühür uyarısı, çalınan rol) yalnız sahibine.
    log: state.log.filter((e) => !e.onlyFor || e.onlyFor.includes(viewerId)),
    allRoles,
  };
}

export function livingCount(state: GameState): number {
  return alivePlayers(state).length;
}
