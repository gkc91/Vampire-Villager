import type { ConnectionState, NetDiagnostics, NetworkAdapter, PeerId } from './NetworkAdapter';
import type { ClientMessage, NetMessage, ServerMessage } from './messages';

/**
 * Ağsız (tek cihaz) adapter — "tek cihazda dene" modu ve testler için.
 * Host aynı sekmede çalışır, peer yoktur; host kendi görünümünü doğrudan
 * HostController'dan alır.
 */
export class LocalAdapter implements NetworkAdapter {
  readonly kind = 'local';

  private stateCb: (state: ConnectionState) => void = () => {};
  private messageCb: (msg: NetMessage, peerId: PeerId) => void = () => {};

  async createRoom(_roomId: string): Promise<void> {
    this.stateCb('connected');
  }

  async joinRoom(_roomId: string): Promise<void> {
    this.stateCb('connected');
  }

  sendToHost(msg: ClientMessage): void {
    // Tek cihaz modunda istemci = host; mesaj doğrudan host'a düşer.
    queueMicrotask(() => this.messageCb(msg, 'local'));
  }

  sendToPlayer(_peerId: PeerId, _msg: ServerMessage): void {
    // Peer yok; host kendi görünümünü doğrudan alır.
  }

  broadcast(_msg: ServerMessage): void {
    // Peer yok.
  }

  onMessage(cb: (msg: NetMessage, peerId: PeerId) => void): void {
    this.messageCb = cb;
  }

  onPeerJoin(_cb: (peerId: PeerId) => void): void {}

  onPeerLeave(_cb: (peerId: PeerId) => void): void {}

  onStateChange(cb: (state: ConnectionState) => void): void {
    this.stateCb = cb;
  }

  onDiagnostics(cb: (diagnostics: NetDiagnostics) => void): void {
    // Tek cihaz modunda ağ yok; teşhis sabit.
    cb({ strategy: 'local', relaysConnected: 0, relaysTotal: 0, peers: 0 });
  }

  async leave(): Promise<void> {
    this.stateCb('closed');
  }
}
