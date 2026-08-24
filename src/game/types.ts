/**
 * Oyun motoru tipleri. Bu dosya UI ve ağ katmanından bağımsızdır;
 * yalnız 02-game-flow.md ve 03-roles.md'deki kuralları yansıtır.
 */

export type PlayerId = string;

export type RoleId = 'vampire' | 'villager' | 'seer' | 'doctor' | 'hunter';

export type Team = 'village' | 'vampire' | 'neutral';

export type Phase =
  | 'LOBBY'
  | 'ROLE_REVEAL'
  | 'NIGHT'
  | 'NIGHT_RESULT'
  | 'DAY_DISCUSSION'
  | 'VOTE'
  | 'VOTE_RESULT'
  | 'HUNTER_SHOT'
  | 'GAME_END';

export type DeathCause = 'vampire' | 'hanging' | 'hunter';

export interface Player {
  id: PlayerId;
  name: string;
  /** Avatar dairesinin rengi (MVP'de görsel avatar yok). */
  color: string;
  isHost: boolean;
  /** Host "sadece anlatıcı" ise false; rol dağıtımına girmez. */
  isPlayer: boolean;
  connected: boolean;
  ready: boolean;
  alive: boolean;
  /** "Tek cihazda dene" modundaki otomatik oyuncu. */
  isBot?: boolean;
  /** 90 sn içinde dönmedi → "köyü terk etti". Ölüm sayılmaz. */
  left: boolean;
  role?: RoleId;
  deathCause?: DeathCause;
  deathRound?: number;
}

export interface GameSettings {
  /** Gündüz tartışma süresi (sn). */
  discussionSeconds: number;
  /** Gece aksiyon süresi (sn) — 02-game-flow.md: 60. */
  nightSeconds: number;
  /** Oylama süresi (sn) — 45. */
  voteSeconds: number;
  /** Avcının son ok süresi (sn) — 30. */
  hunterSeconds: number;
  /** Rol gösterme ekranı üst sınırı (sn). */
  roleRevealSeconds: number;
  /** Anlatım ekranlarının ekranda kalma süresi (sn). */
  resultSeconds: number;
  maxPlayers: number;
  /** Host aynı zamanda oyuncu mu, yoksa sadece anlatıcı mı. */
  hostPlays: boolean;
}

export interface NarrationEvent {
  /** i18n `narration` namespace anahtarı. */
  key: string;
  /** İnterpolasyon parametreleri; rol adı `roleKey` olarak taşınır. */
  params?: { name?: string; roleKey?: RoleId };
  round: number;
  at: number;
}

export interface DeathRecord {
  playerId: PlayerId;
  cause: DeathCause;
  round: number;
  /** Avcı okuysa tetikleyen oyuncu. */
  byPlayerId?: PlayerId;
}

export interface SeerResult {
  round: number;
  targetId: PlayerId;
  isVampire: boolean;
}

export interface NightState {
  /** vampir id → hedef id */
  vampireVotes: Record<PlayerId, PlayerId>;
  /** kâhin id → hedef id */
  seerChecks: Record<PlayerId, PlayerId>;
  /** doktor id → korunan id */
  doctorSaves: Record<PlayerId, PlayerId>;
  /** Bilinçli "pas" diyenler (süre dolması da pas sayılır). */
  passed: PlayerId[];
}

export interface PendingHunter {
  hunterId: PlayerId;
  /** Son ok çözüldükten sonra dönülecek faz. */
  nextPhase: Phase;
}

export interface GameState {
  phase: Phase;
  /** Gece 1 = round 1. LOBBY'de 0. */
  round: number;
  players: Player[];
  settings: GameSettings;
  night: NightState;
  /** doktor id → bir önceki gece koruduğu kişi (üst üste yasak). */
  lastProtected: Record<PlayerId, PlayerId>;
  /** kâhin id → aldığı cevaplar. */
  seerResults: Record<PlayerId, SeerResult[]>;
  /** oy veren id → hedef id | 'abstain' */
  votes: Record<PlayerId, PlayerId | 'abstain'>;
  pendingHunter: PendingHunter | null;
  deaths: DeathRecord[];
  log: NarrationEvent[];
  /** Faz bitiş zamanı (epoch ms). null = süresiz. */
  phaseEndsAt: number | null;
  winner: Team | null;
  /** Deterministik rastgelelik (yalnız host'ta üretilir). */
  seed: number;
}

/** Rollerin gece/ölüm çözümlemesinde ürettiği yan etkiler. */
export type StateEffect =
  | { type: 'attack'; targetId: PlayerId; source: 'vampire' }
  | { type: 'protect'; targetId: PlayerId }
  | { type: 'reveal'; actorId: PlayerId; targetId: PlayerId; isVampire: boolean }
  | { type: 'kill'; targetId: PlayerId; cause: DeathCause; byPlayerId?: PlayerId }
  | { type: 'hunterTrigger'; hunterId: PlayerId };

export interface RoleDefinition {
  id: RoleId;
  team: Team;
  nightAction?: {
    /** Çözümleme sırası: vampir 10, kâhin 20, doktor 30. */
    phase: number;
    targetType: 'player' | 'none';
    validTargets: (state: GameState, actorId: PlayerId) => PlayerId[];
    resolve: (state: GameState, actorId: PlayerId, targetId: PlayerId) => StateEffect[];
  };
  onDeath?: (state: GameState, playerId: PlayerId) => StateEffect[];
  /** Vampirler birbirini bilir. */
  knowsTeammates?: boolean;
  /** Yer tutucu bayrak — MVP'de hepsi false (bkz. 05-monetization.md). */
  premium?: boolean;
}

export type GameAction =
  | { type: 'ADD_PLAYER'; player: Omit<Player, 'alive' | 'left' | 'ready'> }
  | { type: 'SET_READY'; playerId: PlayerId; ready: boolean }
  | { type: 'SET_CONNECTED'; playerId: PlayerId; connected: boolean }
  | { type: 'SET_NAME'; playerId: PlayerId; name: string }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<GameSettings> }
  | { type: 'KICK_PLAYER'; playerId: PlayerId }
  | { type: 'START_GAME' }
  | { type: 'ROLE_SEEN'; playerId: PlayerId }
  | { type: 'NIGHT_ACTION'; playerId: PlayerId; targetId: PlayerId | null }
  | { type: 'VOTE'; playerId: PlayerId; targetId: PlayerId | 'abstain' }
  | { type: 'HUNTER_SHOT'; playerId: PlayerId; targetId: PlayerId | null }
  | { type: 'PLAYER_LEFT'; playerId: PlayerId }
  | { type: 'END_DISCUSSION' }
  | { type: 'TIMEOUT' }
  | { type: 'RESTART' };
