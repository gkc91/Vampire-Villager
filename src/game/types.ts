/**
 * Oyun motoru tipleri — 11 rollük set (03-roles.md).
 * Bu dosya UI ve ağ katmanından bağımsızdır.
 */

export type PlayerId = string;

export type RoleId =
  // Köy
  | 'villager'
  | 'doctor'
  | 'seer'
  | 'detective'
  | 'wizard'
  | 'hunter'
  // Vampirler
  | 'vampire'
  | 'vampireLord'
  | 'bloodWizard'
  | 'mistVampire'
  // Tarafsız
  | 'thief';

export type Team = 'village' | 'vampire' | 'neutral';

export type Phase =
  | 'LOBBY'
  | 'ROLE_REVEAL'
  | 'NIGHT'
  | 'NIGHT_RESULT'
  | 'DAY_DISCUSSION'
  | 'VOTE'
  | 'VOTE_RESULT'
  | 'GAME_END';

/**
 * Gece sırayla işler ve her adım SEÇİM ANINDA uygulanır (03-roles.md).
 * Adımın oyuncusu yoksa / ölmüşse / hakkı bittiyse adım atlanır.
 */
export type NightStep =
  | 'lord'
  | 'bloodWizard'
  | 'mist'
  | 'vampireVote'
  | 'doctor'
  | 'seer'
  | 'detective'
  | 'thief';

export const NIGHT_ORDER: NightStep[] = [
  'lord',
  'bloodWizard',
  'mist',
  'vampireVote',
  'doctor',
  'seer',
  'detective',
  'thief',
];

export type DeathCause = 'vampire' | 'hanging';

export interface Player {
  id: PlayerId;
  name: string;
  color: string;
  isHost: boolean;
  isPlayer: boolean;
  connected: boolean;
  ready: boolean;
  alive: boolean;
  isBot?: boolean;
  left: boolean;
  role?: RoleId;
  /** Sınırlı roller için kalan hak (doktor 2, büyücü 1, lord 1, kan büy. 2). */
  usesLeft?: number;
  deathCause?: DeathCause;
  deathRound?: number;
}

export interface GameSettings {
  discussionSeconds: number;
  /** Her gece adımı için süre. */
  nightStepSeconds: number;
  voteSeconds: number;
  roleRevealSeconds: number;
  resultSeconds: number;
  /** Büyü yapılınca tartışmaya eklenen süre. */
  spellBonusSeconds: number;
  /** Odaya alınacak azami oyuncu (üst sınır yok, kurucu belirler). */
  maxPlayers: number;
  hostPlays: boolean;
  /** Kurucunun seçtiği rol listesi; oyuncu sayısı kadar olmalı. */
  roleSetup: RoleId[];
}

export interface NarrationEvent {
  key: string;
  params?: { name?: string; roleKey?: RoleId };
  round: number;
  at: number;
  /** Yalnız bu oyunculara gösterilir (boşsa herkese). */
  onlyFor?: PlayerId[];
}

export interface DeathRecord {
  playerId: PlayerId;
  cause: DeathCause;
  round: number;
}

export interface SeerResult {
  round: number;
  targetId: PlayerId;
  isVampire: boolean;
}

export interface DetectiveResult {
  round: number;
  targetId: PlayerId;
  /** O gece fiilen seçim yaptı mı (03-roles.md). */
  woke: boolean;
}

export interface NightState {
  /** vampir id → hedef id (ortak kurban oylaması) */
  vampireVotes: Record<PlayerId, PlayerId>;
  /** O gece korunan oyuncu. */
  protectedId: PlayerId | null;
  /** Mühür / sis / büyü ile uyanamayanlar. */
  blocked: PlayerId[];
  /** Sis var mı (bilgi rollerini kapatır). */
  fog: boolean;
  /** O gece fiilen SEÇİM yapanlar — dedektif bunu okur (pas hariç). */
  woke: PlayerId[];
  /**
   * Hangi oyuncu hangi adımı tamamladı: `oyuncuId:adım`.
   * `woke` ile karıştırılmamalı: vampir lordu hem kendi adımında hem kurban
   * oylamasında oynar; tek bir "oynadı" bayrağı onu ikinci adımdan
   * dışlıyordu.
   */
  acted: string[];
  /** Vampir oylamasının sonucu; ölüm gece sonunda çözülür. */
  attackTarget: PlayerId | null;
  /** Lord bu gece dönüştürdüyse: kurban seçimine katılamaz. */
  convertedTonight: PlayerId | null;
}

export interface GameState {
  phase: Phase;
  /** Gece 1 = round 1. */
  round: number;
  /** NIGHT fazındaysa hangi adımdayız. */
  nightStep: NightStep | null;
  players: Player[];
  settings: GameSettings;
  night: NightState;
  /** doktor id → bir önceki gece koruduğu kişi (üst üste yasak). */
  lastProtected: Record<PlayerId, PlayerId>;
  seerResults: Record<PlayerId, SeerResult[]>;
  detectiveResults: Record<PlayerId, DetectiveResult[]>;
  /** Sisler vampiri en erken bu turda tekrar kullanabilir. */
  mistReadyRound: number;
  /** Büyü yapıldıysa o gün oylama açılmaz. */
  spellCastThisDay: boolean;
  /** Büyücünün seçtiği hedef — o gece uyanamaz. */
  spellBlockTarget: PlayerId | null;
  votes: Record<PlayerId, PlayerId | 'abstain'>;
  deaths: DeathRecord[];
  log: NarrationEvent[];
  phaseEndsAt: number | null;
  winner: Team | null;
  seed: number;
}

export type StateEffect =
  | { type: 'attack'; targetId: PlayerId }
  | { type: 'protect'; targetId: PlayerId }
  | { type: 'block'; targetId: PlayerId }
  | { type: 'fog' }
  | { type: 'convert'; targetId: PlayerId }
  | { type: 'steal'; actorId: PlayerId; targetId: PlayerId }
  | { type: 'reveal'; actorId: PlayerId; targetId: PlayerId; isVampire: boolean }
  | { type: 'investigate'; actorId: PlayerId; targetId: PlayerId };

export interface RoleDefinition {
  id: RoleId;
  team: Team;
  /** Vampirler birbirini bilir. */
  knowsTeammates?: boolean;
  /** Sınırlı kullanım hakkı; tanımsızsa sınırsız. */
  maxUses?: number;
  nightAction?: {
    /** Hangi gece adımında oynar. */
    step: NightStep;
    /** Hedef seçmez, kendi üstünde tetiklenir (sis gibi). */
    selfCast?: boolean;
    validTargets: (state: GameState, actorId: PlayerId) => PlayerId[];
    resolve: (state: GameState, actorId: PlayerId, targetId: PlayerId) => StateEffect[];
  };
  /** Büyücü gündüz oynar. */
  dayAction?: {
    validTargets: (state: GameState, actorId: PlayerId) => PlayerId[];
  };
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
  | { type: 'CAST_SPELL'; playerId: PlayerId; targetId: PlayerId }
  | { type: 'VOTE'; playerId: PlayerId; targetId: PlayerId | 'abstain' }
  | { type: 'PLAYER_LEFT'; playerId: PlayerId }
  | { type: 'END_DISCUSSION' }
  | { type: 'TIMEOUT' }
  | { type: 'RESTART' };
