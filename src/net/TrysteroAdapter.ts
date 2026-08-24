import type { MessageAction, Room } from '@trystero-p2p/core';
import type {
  ConnectionState,
  NetDiagnostics,
  NetworkAdapter,
  PeerId,
} from './NetworkAdapter';
import type { ClientMessage, NetMessage, ServerMessage } from './messages';
import { ACTIVE_STRATEGY, loadStrategy } from './strategy';
import { turnServers } from './ice';

const APP_ID = 'vampir-koylu';
/** Trystero action ismi (kısa tutulur). */
const ACTION = 'vk';
/** Teşhis yayını aralığı. */
const DIAGNOSTICS_MS = 1000;

/**
 * Trystero (WebRTC) implementasyonu. Sinyalleşme yöntemi strategy.ts'ten
 * gelir (varsayılan: nostr — 46 relay, kalıcı WebSocket, hızlı).
 *
 * Sıfır sunucu maliyeti. TURN tanımlı değilse yalnız STUN kullanılır;
 * simetrik NAT/CGNAT arkasındaki mobil ağlarda bağlantı kurulamayabilir
 * (bkz. ice.ts ve docs/TESTING.md §4).
 */
export class TrysteroAdapter implements NetworkAdapter {
  readonly kind = 'trystero';

  private room: Room | null = null;
  private action: MessageAction<string> | null = null;
  private isHost = false;
  private roomId = '';
  private hostPeerId: PeerId | null = null;
  private outbox: ClientMessage[] = [];

  private messageCb: (msg: NetMessage, peerId: PeerId) => void = () => {};
  private peerJoinCb: (peerId: PeerId) => void = () => {};
  private peerLeaveCb: (peerId: PeerId) => void = () => {};
  private stateCb: (state: ConnectionState) => void = () => {};
  private diagnosticsCb: (d: NetDiagnostics) => void = () => {};
  private diagnosticsTimer: ReturnType<typeof setInterval> | null = null;
  private getRelaySockets: (() => Record<string, WebSocket>) | null = null;

  async createRoom(roomId: string): Promise<void> {
    this.isHost = true;
    await this.open(roomId);
  }

  async joinRoom(roomId: string): Promise<void> {
    this.isHost = false;
    await this.open(roomId);
  }

  private async open(roomId: string): Promise<void> {
    this.roomId = roomId;
    this.stateCb('connecting');

    const { joinRoom, getRelaySockets } = await loadStrategy();
    this.getRelaySockets = getRelaySockets;

    const turnConfig = turnServers();
    const room = joinRoom(
      { appId: APP_ID, ...(turnConfig.length > 0 ? { turnConfig } : {}) },
      roomId,
      { onJoinError: () => this.stateCb('error') },
    );
    this.room = room;
    this.startDiagnostics();

    // Yük düz metin taşınır; mesaj birleşimimiz JSON'a çevrilir.
    const action = room.makeAction<string>(ACTION);
    this.action = action;

    action.onMessage = (raw, { peerId }) => {
      let msg: NetMessage;
      try {
        msg = JSON.parse(raw) as NetMessage;
      } catch {
        return; // bozuk paket
      }
      // Host kimliğini kendi tanıtır; istemci ondan sonra konuşur.
      if (!this.isHost && msg.type === 'hostHello') {
        this.hostPeerId = peerId;
        this.stateCb('connected');
        this.flushOutbox();
      }
      this.messageCb(msg, peerId);
    };

    room.onPeerJoin = (peerId) => {
      if (this.isHost) {
        // Yeni gelene kendini tanıt: "host benim".
        this.post({ type: 'hostHello', roomId: this.roomId }, peerId);
      }
      this.peerJoinCb(peerId);
    };

    room.onPeerLeave = (peerId) => {
      if (peerId === this.hostPeerId) this.hostPeerId = null;
      this.peerLeaveCb(peerId);
    };

    if (this.isHost) this.stateCb('connected');
  }

  /** target verilmezse odadaki herkese gider. */
  private post(msg: NetMessage, target?: PeerId): void {
    if (!this.action) return;
    void this.action.send(JSON.stringify(msg), target ? { target } : undefined);
  }

  private flushOutbox(): void {
    if (!this.hostPeerId || !this.action) return;
    const queued = this.outbox;
    this.outbox = [];
    for (const msg of queued) this.post(msg, this.hostPeerId);
  }

  sendToHost(msg: ClientMessage): void {
    if (!this.action || !this.hostPeerId) {
      this.outbox.push(msg);
      return;
    }
    this.post(msg, this.hostPeerId);
  }

  sendToPlayer(peerId: PeerId, msg: ServerMessage): void {
    if (!this.isHost) return;
    this.post(msg, peerId);
  }

  broadcast(msg: ServerMessage): void {
    if (!this.isHost) return;
    this.post(msg);
  }

  onMessage(cb: (msg: NetMessage, peerId: PeerId) => void): void {
    this.messageCb = cb;
  }

  onPeerJoin(cb: (peerId: PeerId) => void): void {
    this.peerJoinCb = cb;
  }

  onPeerLeave(cb: (peerId: PeerId) => void): void {
    this.peerLeaveCb = cb;
  }

  onStateChange(cb: (state: ConnectionState) => void): void {
    this.stateCb = cb;
  }

  onDiagnostics(cb: (d: NetDiagnostics) => void): void {
    this.diagnosticsCb = cb;
  }

  /** Sinyal soketlerini ve eş sayısını periyodik olarak raporlar. */
  private startDiagnostics(): void {
    if (this.diagnosticsTimer) clearInterval(this.diagnosticsTimer);
    const report = () => {
      const sockets = this.getRelaySockets?.() ?? {};
      const entries = Object.values(sockets);
      this.diagnosticsCb({
        strategy: ACTIVE_STRATEGY,
        relaysConnected: entries.filter((ws) => ws?.readyState === WebSocket.OPEN).length,
        relaysTotal: entries.length,
        peers: Object.keys(this.room?.getPeers() ?? {}).length,
      });
    };
    report();
    this.diagnosticsTimer = setInterval(report, DIAGNOSTICS_MS);
  }

  async leave(): Promise<void> {
    if (this.diagnosticsTimer) clearInterval(this.diagnosticsTimer);
    this.diagnosticsTimer = null;
    if (this.isHost) this.broadcast({ type: 'hostLeft' });
    await this.room?.leave();
    this.room = null;
    this.action = null;
    this.hostPeerId = null;
    this.stateCb('closed');
  }
}
