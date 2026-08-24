import { joinRoom } from '@trystero-p2p/torrent';
import type { MessageAction, Room } from '@trystero-p2p/core';
import type { ConnectionState, NetworkAdapter, PeerId } from './NetworkAdapter';
import type { ClientMessage, NetMessage, ServerMessage } from './messages';

const APP_ID = 'vampir-koylu';
/** Trystero action ismi (kısa tutulur). */
const ACTION = 'vk';

/**
 * Trystero (WebRTC, torrent tracker sinyalleşmesi) implementasyonu.
 * Sıfır sunucu maliyeti; TURN yok → bazı CGNAT ağlarında bağlantı kurulamaz,
 * bu durumda kullanıcıya "WiFi'a geç" uyarısı gösterilir.
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

    const room = joinRoom({ appId: APP_ID }, roomId, {
      onJoinError: () => this.stateCb('error'),
    });
    this.room = room;

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

  async leave(): Promise<void> {
    if (this.isHost) this.broadcast({ type: 'hostLeft' });
    await this.room?.leave();
    this.room = null;
    this.action = null;
    this.hostPeerId = null;
    this.stateCb('closed');
  }
}
