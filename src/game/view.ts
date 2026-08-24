import type {
  DeathRecord,
  GameSettings,
  GameState,
  NarrationEvent,
  Phase,
  PlayerId,
  RoleId,
  SeerResult,
  Team,
} from './types';
import { ROLES } from './roles';
import { alivePlayers, playerById } from './roles/helpers';
import { hunterTargets } from './stateMachine';

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
  /** Yalnız herkese açıklanmış roller (asılan oyuncu, oyun sonu, hayalet modu). */
  role?: RoleId;
  deathRound?: number;
  hasActed?: boolean;
  hasVoted?: boolean;
}

export interface PlayerView {
  roomId: string;
  phase: Phase;
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
    alive: boolean;
    left: boolean;
    isHost: boolean;
    isPlayer: boolean;
    ready: boolean;
    /** Ölü veya oyun bitti → her şeyi görür. */
    ghost: boolean;
  };
  /** Yalnız vampirlere gider. */
  teammates: PlayerId[];
  /** Yalnız kendi kâhin sonuçları. */
  seerResults: SeerResult[];
  /** Yalnız vampirlere: takım arkadaşlarının bu geceki seçimleri. */
  vampirePicks: Record<PlayerId, PlayerId>;
  nightAction: {
    canAct: boolean;
    roleId?: RoleId;
    validTargets: PlayerId[];
    submitted: boolean;
    myTarget: PlayerId | null;
  };
  vote: {
    canVote: boolean;
    myVote: PlayerId | 'abstain' | null;
    /** Yalnız oylama bitince dolar. */
    tally: Record<PlayerId, number> | null;
  };
  hunter: {
    active: boolean;
    isMe: boolean;
    hunterName: string | null;
    validTargets: PlayerId[];
  };
  deaths: DeathRecord[];
  log: NarrationEvent[];
  /** Hayalet modu / oyun sonu: herkesin rolü. */
  allRoles: Record<PlayerId, RoleId> | null;
}

function myNightTarget(state: GameState, playerId: PlayerId): PlayerId | null {
  return (
    state.night.vampireVotes[playerId] ??
    state.night.seerChecks[playerId] ??
    state.night.doctorSaves[playerId] ??
    null
  );
}

function hasActed(state: GameState, playerId: PlayerId): boolean {
  return (
    state.night.passed.includes(playerId) ||
    playerId in state.night.vampireVotes ||
    playerId in state.night.seerChecks ||
    playerId in state.night.doctorSaves
  );
}

/**
 * Roller oyun bitene kadar HERKESE kapalıdır: ne gece ölümünde ne de
 * asılmada açıklanır. Oyun bitince (bir taraf tükenince) herkesin ekranında
 * tüm roller açılır. Ölü oyuncular ayrıca hayalet modunda her şeyi görür.
 */
function isRolePublic(state: GameState, _playerId: PlayerId): boolean {
  return state.phase === 'GAME_END';
}

export function buildPlayerView(state: GameState, roomId: string, viewerId: PlayerId): PlayerView {
  const me = playerById(state, viewerId);
  const gameOver = state.phase === 'GAME_END';
  const ghost = Boolean(me && me.isPlayer && (!me.alive || me.left)) || gameOver;
  const seeEverything = ghost;

  const players: PublicPlayer[] = state.players.map((p) => {
    const revealed = seeEverything || isRolePublic(state, p.id);
    return {
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
      role: revealed ? p.role : undefined,
      deathRound: p.deathRound,
      hasActed: state.phase === 'NIGHT' ? hasActed(state, p.id) : undefined,
      hasVoted: state.phase === 'VOTE' ? p.id in state.votes : undefined,
    };
  });

  const myRole = me?.role;
  const roleDef = myRole ? ROLES[myRole] : undefined;
  const canAct =
    state.phase === 'NIGHT' &&
    Boolean(me?.alive && !me?.left && roleDef?.nightAction) &&
    !hasActed(state, viewerId);

  const teammates =
    me && myRole && ROLES[myRole].knowsTeammates
      ? state.players.filter((p) => p.role === myRole && p.id !== me.id).map((p) => p.id)
      : [];

  const vampirePicks: Record<PlayerId, PlayerId> = {};
  if (myRole === 'vampire' && state.phase === 'NIGHT') {
    for (const [voterId, targetId] of Object.entries(state.night.vampireVotes)) {
      vampirePicks[voterId] = targetId;
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

  const pending = state.pendingHunter;
  const hunterPlayer = pending ? playerById(state, pending.hunterId) : undefined;

  const allRoles: Record<PlayerId, RoleId> | null = seeEverything ? {} : null;
  if (allRoles) {
    for (const p of state.players) {
      if (p.role) allRoles[p.id] = p.role;
    }
  }

  return {
    roomId,
    phase: state.phase,
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
      alive: me?.alive ?? false,
      left: me?.left ?? false,
      isHost: me?.isHost ?? false,
      isPlayer: me?.isPlayer ?? false,
      ready: me?.ready ?? false,
      ghost,
    },
    teammates,
    seerResults: myRole === 'seer' ? (state.seerResults[viewerId] ?? []) : [],
    vampirePicks,
    nightAction: {
      canAct,
      roleId: roleDef?.nightAction ? myRole : undefined,
      validTargets:
        state.phase === 'NIGHT' && roleDef?.nightAction && me?.alive && !me.left
          ? roleDef.nightAction.validTargets(state, viewerId)
          : [],
      submitted: state.phase === 'NIGHT' ? hasActed(state, viewerId) : false,
      myTarget: state.phase === 'NIGHT' ? myNightTarget(state, viewerId) : null,
    },
    vote: {
      canVote: state.phase === 'VOTE' && Boolean(me?.alive && !me?.left) && !(viewerId in state.votes),
      myVote: state.votes[viewerId] ?? null,
      tally,
    },
    hunter: {
      active: state.phase === 'HUNTER_SHOT',
      isMe: pending?.hunterId === viewerId,
      hunterName: hunterPlayer?.name ?? null,
      validTargets: pending?.hunterId === viewerId ? hunterTargets(state) : [],
    },
    deaths: state.deaths,
    log: state.log,
    allRoles,
  };
}

/** Lobi ekranı için oyuncu sayısı özeti. */
export function livingCount(state: GameState): number {
  return alivePlayers(state).length;
}
