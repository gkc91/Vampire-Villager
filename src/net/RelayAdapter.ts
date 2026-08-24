import type {
  ConnectionState,
  NetDiagnostics,
  NetworkAdapter,
  PeerId,
} from './NetworkAdapter';
import type { ClientMessage, NetMessage, ServerMessage } from './messages';

/**
 * Sunucu üzerinden bağlantı (Cloudflare Durable Object aktarıcısı).
 *
 * P2P'nin aksine NAT delme, eş keşfi ve relay seçimi yok: tek bir WebSocket
 * açılır, bağlantı anında kurulur. Aktarıcı oyunun kurallarını bilmez,
 * yalnız mesaj taşır — host-otoriter model aynen korunur.
 */

type ServerEnvelope =
  | { t: 'welcome'; peerId: string; peers: string[] }
  | { t: 'peerJoin'; peerId: string }
  | { t: 'peerLeave'; peerId: string }
  | { t: 'msg'; from: string; data: string };

const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 5000;
/** Boşta kalan soketin ara sunucular tarafından kapatılmasını engeller. */
const HEARTBEAT_MS = 25_000;

/**
 * Aktarıcı Cloudflare Worker'da çalışır; site nerede barındırılırsa
 * barındırılsın (Vercel, Pages, özel alan adı) buraya bağlanır.
 * WebSocket bağlantıları CORS'a tabi değildir, çapraz origin sorun değil.
 */
const PRODUCTION_RELAY = 'wss://vampire-villager.gokcekantarci.workers.dev';

/** Aktarıcı adresi. Öncelik: .env → aynı origin (Worker) → üretim adresi. */
export function relayBaseUrl(): string | null {
  const configured = (import.meta.env.VITE_RELAY_URL as string | undefined)?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window === 'undefined') return null;
  const { protocol, host } = window.location;
  // Yerel geliştirme: aktarıcı ayrı portta (`npm run dev:relay`) → .env şart.
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return null;
  // Site aktarıcıyla aynı Worker'dan servis ediliyorsa onu kullan.
  if (host.endsWith('.workers.dev')) return `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}`;
  // Vercel / Pages / özel alan adı: aktarıcı yine Worker'da.
  return PRODUCTION_RELAY;
}

export function isRelayAvailable(): boolean {
  return relayBaseUrl() !== null;
}

export class RelayAdapter implements NetworkAdapter {
  readonly kind = 'relay';

  private socket: WebSocket | null = null;
  private roomId = '';
  private isHost = false;
  private hostPeerId: PeerId | null = null;
  private knownPeers = new Set<PeerId>();
  private outbox: ClientMessage[] = [];
  /**
   * Son kimlik tanıtma mesajı. Bağlantı koptuğunda sunucu yeni bir peerId
   * verir; bunu tekrar göndermezsek host bizi eski (ölü) peerId ile
   * tanımaya devam eder ve görünümler boşluğa gider.
   */
  private identityMsg: ClientMessage | null = null;
  private closedByUs = false;
  private reconnectAttempt = 0;
  private openedAt = 0;
  private timings: { module?: number; relay?: number; peer?: number } = {};
  private diagnosticsTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private onVisible: (() => void) | null = null;

  private messageCb: (msg: NetMessage, peerId: PeerId) => void = () => {};
  private peerJoinCb: (peerId: PeerId) => void = () => {};
  private peerLeaveCb: (peerId: PeerId) => void = () => {};
  private stateCb: (state: ConnectionState) => void = () => {};
  private diagnosticsCb: (d: NetDiagnostics) => void = () => {};

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
    this.closedByUs = false;
    this.openedAt = performance.now();
    this.timings = { module: 0 };
    this.stateCb('connecting');
    this.startDiagnostics();
    this.startHeartbeat();
    this.watchVisibility();
    this.connect();
  }

  /**
   * Telefon kilitlenince / başka uygulamaya geçilince tarayıcı sekmeyi
   * donduruyor ve soket ölüyor; zamanlayıcılar da durduğu için yeniden
   * bağlanma tetiklenmiyordu. Sekme öne döner dönmez bağlantıyı tazeliyoruz.
   * Host bunu yapmazsa oda boş kalır ve kimse katılamaz.
   */
  private watchVisibility(): void {
    if (this.onVisible || typeof document === 'undefined') return;
    this.onVisible = () => {
      if (document.visibilityState !== 'visible' || this.closedByUs) return;
      if (this.socket?.readyState === WebSocket.OPEN) return;
      this.reconnectAttempt = 0;
      this.connect();
    };
    document.addEventListener('visibilitychange', this.onVisible);
    window.addEventListener('focus', this.onVisible);
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) this.socket.send('ping');
    }, HEARTBEAT_MS);
  }

  private connect(): void {
    const base = relayBaseUrl();
    if (!base) {
      this.stateCb('error');
      return;
    }

    const socket = new WebSocket(`${base}/room/${this.roomId}`);
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectAttempt = 0;
      this.timings.relay ??= Math.round(performance.now() - this.openedAt);
    };

    socket.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      if (event.data === 'pong') return; // kalp atışı yanıtı
      let envelope: ServerEnvelope;
      try {
        envelope = JSON.parse(event.data) as ServerEnvelope;
      } catch {
        return;
      }
      this.handleEnvelope(envelope);
    };

    socket.onclose = () => {
      if (this.closedByUs) return;
      this.stateCb('connecting');
      this.scheduleReconnect();
    };

    socket.onerror = () => {
      // onclose zaten arkasından gelir; yeniden bağlanma orada işlenir.
    };
  }

  private handleEnvelope(envelope: ServerEnvelope): void {
    switch (envelope.t) {
      case 'welcome': {
        this.knownPeers = new Set(envelope.peers);
        if (envelope.peers.length > 0) {
          this.timings.peer ??= Math.round(performance.now() - this.openedAt);
        }
        this.stateCb('connected');
        if (this.isHost) {
          // Odada bizden önce bekleyenler varsa kendimizi tanıtalım.
          for (const peer of envelope.peers) {
            this.post({ type: 'hostHello', roomId: this.roomId }, peer);
          }
        } else {
          // Yeni peerId aldık: kimliğimizi tazeleyip bekleyenleri duyur.
          this.hostPeerId = null;
          this.announce();
        }
        break;
      }

      case 'peerJoin': {
        this.knownPeers.add(envelope.peerId);
        this.timings.peer ??= Math.round(performance.now() - this.openedAt);
        if (this.isHost) {
          this.post({ type: 'hostHello', roomId: this.roomId }, envelope.peerId);
        } else if (!this.hostPeerId) {
          this.announce();
        }
        this.peerJoinCb(envelope.peerId);
        break;
      }

      case 'peerLeave': {
        this.knownPeers.delete(envelope.peerId);
        if (envelope.peerId === this.hostPeerId) this.hostPeerId = null;
        this.peerLeaveCb(envelope.peerId);
        break;
      }

      case 'msg': {
        let msg: NetMessage;
        try {
          msg = JSON.parse(envelope.data) as NetMessage;
        } catch {
          return;
        }
        if (!this.isHost && msg.type === 'hostHello') {
          this.hostPeerId = envelope.from;
          this.flushOutbox();
        }
        this.messageCb(msg, envelope.from);
        break;
      }
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempt += 1;
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** (this.reconnectAttempt - 1), RECONNECT_MAX_MS);
    setTimeout(() => {
      if (!this.closedByUs) this.connect();
    }, delay);
  }

  /** Kimliği ve bekleyen mesajları odadaki herkese duyurur. */
  private announce(): void {
    if (this.identityMsg) this.post(this.identityMsg);
    for (const msg of this.outbox) this.post(msg);
  }

  private flushOutbox(): void {
    if (!this.hostPeerId) return;
    const queued = this.outbox;
    this.outbox = [];
    for (const msg of queued) this.post(msg, this.hostPeerId);
  }

  /** target verilmezse odadaki herkese gider. */
  private post(msg: NetMessage, target?: PeerId): void {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ to: target, data: JSON.stringify(msg) }));
  }

  sendToHost(msg: ClientMessage): void {
    if (msg.type === 'join') this.identityMsg = msg;
    if (!this.hostPeerId) {
      this.outbox.push(msg);
      this.announce();
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

  private startDiagnostics(): void {
    if (this.diagnosticsTimer) clearInterval(this.diagnosticsTimer);
    const report = () => {
      const open = this.socket?.readyState === WebSocket.OPEN;
      this.diagnosticsCb({
        strategy: this.kind,
        relaysConnected: open ? 1 : 0,
        relaysTotal: 1,
        peers: this.knownPeers.size,
        timings: { ...this.timings },
      });
    };
    report();
    this.diagnosticsTimer = setInterval(report, 1000);
  }

  async leave(): Promise<void> {
    this.closedByUs = true;
    if (this.diagnosticsTimer) clearInterval(this.diagnosticsTimer);
    this.diagnosticsTimer = null;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
    if (this.onVisible) {
      document.removeEventListener('visibilitychange', this.onVisible);
      window.removeEventListener('focus', this.onVisible);
      this.onVisible = null;
    }
    if (this.isHost) this.broadcast({ type: 'hostLeft' });
    this.socket?.close();
    this.socket = null;
    this.hostPeerId = null;
    this.knownPeers.clear();
    this.stateCb('closed');
  }
}
