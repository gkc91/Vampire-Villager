import type { NetworkAdapter, PeerId } from '../net/NetworkAdapter';
import type { ClientMessage, NetMessage, ServerMessage } from '../net/messages';
import { isClientMessage } from '../net/messages';
import type { GameAction, GameSettings, GameState, PlayerId } from '../game/types';
import { createInitialState, reduce } from '../game/stateMachine';
import { buildPlayerView, type PlayerView } from '../game/view';
import { botAction } from '../game/bot';
import { colorForToken } from '../util/identity';

/** Kopan oyuncunun geri dönmesi için tanınan süre (01-architecture.md). */
export const SUSPENSION_MS = 90_000;
const TICK_MS = 500;
const BOT_MIN_DELAY = 800;
const BOT_MAX_DELAY = 3500;

/**
 * Oyun mantığının TAMAMI burada, host cihazında çalışır. İstemciler yalnız
 * niyet gönderir; herkese kendi filtrelenmiş görünümü döner.
 */
export class HostController {
  private state: GameState;
  private peerByPlayer = new Map<PlayerId, PeerId>();
  private playerByPeer = new Map<PeerId, PlayerId>();
  private suspensions = new Map<PlayerId, ReturnType<typeof setTimeout>>();
  private botTimers = new Map<PlayerId, ReturnType<typeof setTimeout>>();
  private ticker: ReturnType<typeof setInterval> | null = null;
  private botCounter = 0;

  constructor(
    private adapter: NetworkAdapter,
    readonly roomId: string,
    readonly hostPlayerId: PlayerId,
    hostName: string,
    private onHostView: (view: PlayerView) => void,
  ) {
    this.state = createInitialState();
    this.state = reduce(this.state, {
      type: 'ADD_PLAYER',
      player: {
        id: hostPlayerId,
        name: hostName,
        color: colorForToken(hostPlayerId),
        isHost: true,
        isPlayer: true,
        connected: true,
      },
    });
  }

  async start(): Promise<void> {
    this.adapter.onMessage((msg, peerId) => this.handleMessage(msg, peerId));
    this.adapter.onPeerLeave((peerId) => this.handlePeerLeave(peerId));
    await this.adapter.createRoom(this.roomId);
    this.ticker = setInterval(() => this.tick(), TICK_MS);
    this.publish();
  }

  stop(): void {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
    for (const timer of this.suspensions.values()) clearTimeout(timer);
    for (const timer of this.botTimers.values()) clearTimeout(timer);
    this.suspensions.clear();
    this.botTimers.clear();
    void this.adapter.leave();
  }

  getState(): GameState {
    return this.state;
  }

  /** Host'un kendi ekranından tetiklediği aksiyonlar. */
  dispatch(action: GameAction): void {
    this.state = reduce(this.state, action);
    this.publish();
  }

  updateSettings(settings: Partial<GameSettings>): void {
    this.dispatch({ type: 'UPDATE_SETTINGS', settings });
  }

  /** Tek cihaz modunda otomatik oyuncu ekler. */
  addBot(name: string): void {
    this.botCounter += 1;
    const id = `bot-${this.botCounter}`;
    this.dispatch({
      type: 'ADD_PLAYER',
      player: {
        id,
        name,
        color: colorForToken(id),
        isHost: false,
        isPlayer: true,
        connected: true,
        isBot: true,
      },
    });
    this.dispatch({ type: 'SET_READY', playerId: id, ready: true });
  }

  removeBot(playerId: PlayerId): void {
    this.dispatch({ type: 'KICK_PLAYER', playerId });
  }

  // ------------------------------------------------------------- ağ tarafı

  private handleMessage(msg: NetMessage, peerId: PeerId): void {
    if (!isClientMessage(msg)) return; // host, sunucu mesajlarını yok sayar
    this.handleClientMessage(msg, peerId);
  }

  private handleClientMessage(msg: ClientMessage, peerId: PeerId): void {
    if (msg.type === 'join') {
      this.handleJoin(msg, peerId);
      return;
    }

    // Kimlik doğrulama: token bu peer'e mi ait?
    const mappedPlayer = this.playerByPeer.get(peerId);
    const playerId = mappedPlayer ?? (peerId === 'local' ? msg.token : undefined);
    if (!playerId || playerId !== msg.token) return;

    switch (msg.type) {
      case 'ready':
        this.dispatch({ type: 'SET_READY', playerId, ready: msg.ready });
        break;
      case 'setName':
        this.dispatch({ type: 'SET_NAME', playerId, name: msg.name.slice(0, 20) });
        break;
      case 'roleSeen':
        this.dispatch({ type: 'ROLE_SEEN', playerId });
        break;
      case 'nightAction':
        this.dispatch({ type: 'NIGHT_ACTION', playerId, targetId: msg.targetId });
        break;
      case 'vote':
        this.dispatch({ type: 'VOTE', playerId, targetId: msg.targetId });
        break;
      case 'castSpell':
        this.dispatch({ type: 'CAST_SPELL', playerId, targetId: msg.targetId });
        break;
      case 'leave':
        this.dispatch({ type: 'PLAYER_LEFT', playerId });
        break;
      default:
        break;
    }
  }

  private handleJoin(msg: Extract<ClientMessage, { type: 'join' }>, peerId: PeerId): void {
    // Host kimliği yalnız bu cihazda yaşar; ağdan devralınamaz.
    if (msg.token === this.hostPlayerId && peerId !== 'local') {
      this.send(peerId, { type: 'joinRejected', reason: 'duplicateSession' });
      return;
    }
    // Aynı token başka bir AKTİF peer'de açıksa (ör. ikinci sekme) reddet.
    // "Aktif mi" sorusunu taşıma katmanına soruyoruz: host'un bağlantısı bir
    // kez ölüp döndüğünde aradaki peerLeave olayları kaçtığı için kendi
    // hafızası eskimiş olabiliyordu ve dönen herkes reddediliyordu.
    const previousPeer = this.peerByPlayer.get(msg.token);
    if (previousPeer && previousPeer !== peerId) {
      if (this.adapter.isPeerConnected(previousPeer)) {
        this.send(peerId, { type: 'joinRejected', reason: 'duplicateSession' });
        return;
      }
      // Eski bağlantı gerçekten düşmüş: eskimiş eşleşmeyi temizle.
      this.playerByPeer.delete(previousPeer);
      this.peerByPlayer.delete(msg.token);
    }

    const existing = this.state.players.find((p) => p.id === msg.token);

    if (!existing) {
      if (this.state.phase !== 'LOBBY') {
        this.send(peerId, { type: 'joinRejected', reason: 'gameInProgress' });
        return;
      }
      if (this.state.players.filter((p) => !p.left).length >= this.state.settings.maxPlayers) {
        this.send(peerId, { type: 'joinRejected', reason: 'roomFull' });
        return;
      }
      const nameTaken = this.state.players.some(
        (p) => p.name.toLowerCase() === msg.name.trim().toLowerCase(),
      );
      if (nameTaken) {
        this.send(peerId, { type: 'joinRejected', reason: 'nameTaken' });
        return;
      }
    }

    this.playerByPeer.set(peerId, msg.token);
    this.peerByPlayer.set(msg.token, peerId);

    const suspension = this.suspensions.get(msg.token);
    if (suspension) {
      clearTimeout(suspension);
      this.suspensions.delete(msg.token);
    }

    this.state = reduce(this.state, {
      type: 'ADD_PLAYER',
      player: {
        id: msg.token,
        name: msg.name.slice(0, 20),
        color: msg.color || colorForToken(msg.token),
        isHost: false,
        isPlayer: true,
        connected: true,
      },
    });
    this.state = reduce(this.state, { type: 'SET_CONNECTED', playerId: msg.token, connected: true });

    this.send(peerId, { type: 'joined', playerId: msg.token });
    this.publish();
  }

  private handlePeerLeave(peerId: PeerId): void {
    const playerId = this.playerByPeer.get(peerId);
    if (!playerId) return;
    this.playerByPeer.delete(peerId);
    if (this.peerByPlayer.get(playerId) === peerId) this.peerByPlayer.delete(playerId);

    if (this.state.phase === 'LOBBY') {
      this.dispatch({ type: 'PLAYER_LEFT', playerId });
      return;
    }

    // 90 sn askıda tut; dönmezse "köyü terk etti".
    this.dispatch({ type: 'SET_CONNECTED', playerId, connected: false });
    const timer = setTimeout(() => {
      this.suspensions.delete(playerId);
      this.dispatch({ type: 'PLAYER_LEFT', playerId });
    }, SUSPENSION_MS);
    this.suspensions.set(playerId, timer);
  }

  private send(peerId: PeerId, msg: ServerMessage): void {
    this.adapter.sendToPlayer(peerId, msg);
  }

  // ------------------------------------------------------- zamanlayıcı/bot

  private tick(): void {
    const endsAt = this.state.phaseEndsAt;
    if (endsAt !== null && Date.now() >= endsAt) {
      this.dispatch({ type: 'TIMEOUT' });
    }
  }

  private scheduleBots(): void {
    for (const player of this.state.players) {
      if (!player.isBot || player.left) continue;
      if (this.botTimers.has(player.id)) continue;
      const view = buildPlayerView(this.state, this.roomId, player.id);
      if (!botAction(view)) continue;

      const delay = BOT_MIN_DELAY + Math.random() * (BOT_MAX_DELAY - BOT_MIN_DELAY);
      const timer = setTimeout(() => {
        this.botTimers.delete(player.id);
        const current = buildPlayerView(this.state, this.roomId, player.id);
        const action = botAction(current);
        if (action) this.dispatch(action);
      }, delay);
      this.botTimers.set(player.id, timer);
    }
  }

  /** Her oyuncuya YALNIZ kendi görünümünü yollar. */
  private publish(): void {
    this.onHostView(buildPlayerView(this.state, this.roomId, this.hostPlayerId));

    for (const [playerId, peerId] of this.peerByPlayer) {
      this.send(peerId, {
        type: 'view',
        view: buildPlayerView(this.state, this.roomId, playerId),
      });
    }

    this.scheduleBots();
  }
}
