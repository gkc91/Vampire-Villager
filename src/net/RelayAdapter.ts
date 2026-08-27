import type {
  ConnectionState,
  NetDiagnostics,
  NetworkAdapter,
  PeerId,
} from './NetworkAdapter';
import { PROTOCOL_VERSION } from './messages';
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
 * Aktarıcı adresi. Site ve aktarıcı aynı Cloudflare Worker'dan servis
 * edildiği için varsayılan olarak aynı origin kullanılır; ileride özel bir
 * alan adı bağlandığında da kendiliğinden doğru adresi verir.
 *
 * Yerel geliştirmede site Vite'ta (5173), aktarıcı ayrı portta olur
 * (`npm run dev:relay`) → `.env` içine VITE_RELAY_URL yazılmalı.
 */
export function relayBaseUrl(): string | null {
  const configured = (import.meta.env.VITE_RELAY_URL as string | undefined)?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window === 'undefined') return null;
  const { protocol, host } = window.location;
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return null;
  return `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}`;
}

export function isRelayAvailable(): boolean {
  return relayBaseUrl() !== null;
}

/** Aktarıcı ölçümü — "neden bağlanamıyorum" sorusunu ikiye ayırır. */
export interface RelayProbe {
  /** Siteye HTTP isteği gidiyor mu (internet var mı, engelli mi). */
  site: boolean;
  /** WebSocket açılabiliyor mu. */
  socket: boolean;
  /** Soket kapandıysa kapanma kodu (1006 = ağ kesti). */
  closeCode?: number;
  /** Soketin açılma süresi (ms). */
  ms?: number;
  /** Soket 8 sn içinde ne açıldı ne kapandı (yavaş ağ / sessiz engel). */
  timedOut?: boolean;
  /** Uzun ömürlü HTTP akışı (SSE) geçiyor mu — null: denenmedi. */
  sse: boolean | null;
}

/**
 * Bir telefon "sunucuya bağlanamadım" dediğinde iki bambaşka sebep olabilir:
 * internete hiç çıkamıyordur (sayfa servis çalışanının önbelleğinden açılmış
 * olabilir, kullanıcı farkı anlamaz), ya da internet vardır ama WebSocket
 * engellenmiştir. Bu ölçüm ikisini ayırır.
 */
export async function probeRelay(): Promise<RelayProbe> {
  const result: RelayProbe = { site: false, socket: false, sse: null };
  const base = relayBaseUrl();

  try {
    const httpBase = base ? base.replace(/^ws/, 'http') : window.location.origin;
    const res = await fetch(`${httpBase}/?probe=${Date.now()}`, { cache: 'no-store' });
    // 404 bile olsa sunucuya ULAŞILMIŞ demektir; aranan şey budur.
    result.site = res.status > 0;
  } catch {
    result.site = false;
  }

  if (!base) return result;

  await new Promise<void>((resolve) => {
    const started = performance.now();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    let socket: WebSocket;
    try {
      socket = new WebSocket(`${base}/room/PROBE`);
    } catch {
      finish();
      return;
    }
    const timer = setTimeout(() => {
      result.timedOut = true;
      try {
        socket.close();
      } catch {
        /* yoksay */
      }
      finish();
    }, 8000);
    socket.onopen = () => {
      result.socket = true;
      result.ms = Math.round(performance.now() - started);
      clearTimeout(timer);
      try {
        socket.close();
      } catch {
        /* yoksay */
      }
      finish();
    };
    socket.onclose = (event) => {
      result.closeCode = event.code;
      clearTimeout(timer);
      finish();
    };
    socket.onerror = () => {
      clearTimeout(timer);
      finish();
    };
  });

  // Soket açılmadıysa: engel WebSocket'e mi özel, yoksa ağ hiçbir kalıcı
  // bağlantıya izin vermiyor mu? Cevap çözümü belirliyor.
  if (!result.socket && result.site) {
    const httpBase = base.replace(/^ws/, 'http');
    try {
      const res = await fetch(`${httpBase}/probe/sse?t=${Date.now()}`, { cache: 'no-store' });
      const type = res.headers.get('content-type') ?? '';
      result.sse = res.ok && type.includes('text/event-stream');
    } catch {
      result.sse = false;
    }
  }

  return result;
}

/** WebSocket bu süre içinde açılmazsa HTTP taşımasına geçilir. */
const WS_GIVE_UP_MS = 6000;
/** Host tanışması gelene kadar kimliği bu aralıkla tekrar duyur. */
const ANNOUNCE_RETRY_MS = 2500;
/** 409 sonrası akış yeniden kurulurken beklenen süre. */
const RESEND_DELAY_MS = 400;
/** Aynı sekmede tekrar 6 saniye beklememek için. */
const HTTP_FALLBACK_KEY = 'vk-http-fallback';

/** sessionStorage her ortamda yok (testler, gizli mod); erişim korumalı. */
function httpFallbackRemembered(): boolean {
  try {
    return globalThis.sessionStorage?.getItem(HTTP_FALLBACK_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberHttpFallback(): void {
  try {
    globalThis.sessionStorage?.setItem(HTTP_FALLBACK_KEY, '1');
  } catch {
    /* gizli mod: sorun değil */
  }
}

export class RelayAdapter implements NetworkAdapter {
  readonly kind = 'relay';

  private socket: WebSocket | null = null;
  /**
   * WebSocket açılmayan ağlar için HTTP taşıması (SSE + POST).
   *
   * Gerçek vaka: bir telefonda HTTPS çalışırken soket 1006 ile kapandı.
   * QR ile gelen rastgele bir müşteriye "ağını değiştir" denemeyeceğine
   * göre, soket açılmazsa oyun kendiliğinden bu yola geçer.
   */
  private stream: EventSource | null = null;
  private httpPeerId: PeerId | null = null;
  private useHttp = false;
  private wsWatchdog: ReturnType<typeof setTimeout> | null = null;
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
  /**
   * Host tanışması (hostHello) gelene kadar kimliği tekrar tekrar duyurur.
   *
   * Sahada çıktı: iPhone host HTTP taşımasındayken Android konuk odaya
   * girdi, host onu gördü ama konuk "bağlanıyor"da kaldı. Sebebi tek bir
   * mesajın düşmesiydi — mobil ağda akış her an kesilebiliyor ve o mesajı
   * kimse yeniden göndermiyordu. Artık tanışma kendi kendini onarıyor.
   */
  private announceTimer: ReturnType<typeof setInterval> | null = null;

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
      if (this.useHttp) {
        if (this.stream?.readyState !== EventSource.CLOSED) return;
      } else if (this.socket?.readyState === WebSocket.OPEN) {
        return;
      }
      this.reconnectAttempt = 0;
      this.connect();
    };
    document.addEventListener('visibilitychange', this.onVisible);
    window.addEventListener('focus', this.onVisible);
  }

  /** Tanışma tamamlanana kadar sürer; tamamlanınca kendini durdurur. */
  private startAnnounceRetry(): void {
    if (this.announceTimer || this.isHost) return;
    this.announceTimer = setInterval(() => {
      if (this.closedByUs || this.hostPeerId) {
        this.stopAnnounceRetry();
        return;
      }
      this.announce();
    }, ANNOUNCE_RETRY_MS);
  }

  private stopAnnounceRetry(): void {
    if (!this.announceTimer) return;
    clearInterval(this.announceTimer);
    this.announceTimer = null;
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (!this.useHttp && this.socket?.readyState === WebSocket.OPEN) this.socket.send('ping');
    }, HEARTBEAT_MS);
  }

  private connect(): void {
    const base = relayBaseUrl();
    if (!base) {
      this.stateCb('error');
      return;
    }

    if (this.useHttp || httpFallbackRemembered()) {
      this.connectHttp(base);
      return;
    }

    // Soket bu süre içinde açılmazsa ağ onu engelliyor demektir; beklemeye
    // devam etmek yerine HTTP'ye geçiyoruz.
    this.clearWatchdog();
    this.wsWatchdog = setTimeout(() => this.fallbackToHttp(), WS_GIVE_UP_MS);

    const socket = new WebSocket(`${base}/room/${this.roomId}`);
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectAttempt = 0;
      this.clearWatchdog();
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
      // Hiç açılmadan kapandıysa engel soketedir; HTTP'yi dene.
      if (this.timings.relay === undefined) {
        this.fallbackToHttp();
        return;
      }
      this.stateCb('connecting');
      this.scheduleReconnect();
    };

    socket.onerror = () => {
      // onclose zaten arkasından gelir; yeniden bağlanma orada işlenir.
    };
  }

  private clearWatchdog(): void {
    if (!this.wsWatchdog) return;
    clearTimeout(this.wsWatchdog);
    this.wsWatchdog = null;
  }

  /** WebSocket bu ağda geçmiyor: kalan her şeyi HTTP üzerinden yürüt. */
  private fallbackToHttp(): void {
    if (this.useHttp || this.closedByUs) return;
    this.clearWatchdog();
    this.useHttp = true;
    // Aynı oturumda ikinci odada 6 saniye daha beklemeyelim.
    rememberHttpFallback();
    try {
      this.socket?.close();
    } catch {
      /* zaten kapalı */
    }
    this.socket = null;
    const base = relayBaseUrl();
    if (base) this.connectHttp(base);
  }

  private connectHttp(base: string): void {
    this.stream?.close();
    const httpBase = base.replace(/^ws/, 'http');
    // Kimliği İSTEMCİ taşır: akış koptuğunda aynı peerId ile dönüp odadaki
    // yerimizi koruyoruz. Tahmin edilemez olması için tam UUID.
    this.httpPeerId ??= crypto.randomUUID();

    const stream = new EventSource(
      `${httpBase}/stream/${this.roomId}?peer=${encodeURIComponent(this.httpPeerId)}`,
    );
    this.stream = stream;

    stream.onopen = () => {
      this.reconnectAttempt = 0;
      this.timings.relay ??= Math.round(performance.now() - this.openedAt);
    };

    stream.onmessage = (event) => {
      let envelope: ServerEnvelope;
      try {
        envelope = JSON.parse(event.data as string) as ServerEnvelope;
      } catch {
        return;
      }
      this.handleEnvelope(envelope);
    };

    stream.onerror = () => {
      // EventSource kendi kendine yeniden bağlanır; kimliğimiz sabit
      // olduğu için odadaki yerimiz korunur.
      if (!this.closedByUs) this.stateCb('connecting');
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
            this.post({ type: 'hostHello', roomId: this.roomId, protocol: PROTOCOL_VERSION }, peer);
          }
        } else {
          // Yeni peerId aldık: kimliğimizi tazeleyip bekleyenleri duyur.
          this.hostPeerId = null;
          this.announce();
          this.startAnnounceRetry();
        }
        break;
      }

      case 'peerJoin': {
        this.knownPeers.add(envelope.peerId);
        this.timings.peer ??= Math.round(performance.now() - this.openedAt);
        if (this.isHost) {
          this.post({ type: 'hostHello', roomId: this.roomId, protocol: PROTOCOL_VERSION }, envelope.peerId);
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
          this.stopAnnounceRetry();
          this.flushOutbox();
        }
        // Konuk hâlâ kimliğini duyuruyorsa tanışmamız düşmüş demektir;
        // cevabı yenile. (Yalnız 'join' tetikler, oyun trafiğini şişirmez.)
        if (this.isHost && msg.type === 'join') {
          this.post({ type: 'hostHello', roomId: this.roomId, protocol: PROTOCOL_VERSION }, envelope.from);
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
    const body = JSON.stringify({ to: target, data: JSON.stringify(msg) });

    if (this.useHttp) {
      const base = relayBaseUrl();
      if (!base || !this.httpPeerId) return;
      const httpBase = base.replace(/^ws/, 'http');
      // keepalive yalnız KÜÇÜK gövdeler için: tarayıcı sınırı 64 KB ve
      // aşılırsa istek sessizce başarısız olur. Oyun görünümleri büyüyebilir.
      const keepalive = body.length < 60_000;
      void fetch(
        `${httpBase}/send/${this.roomId}?peer=${encodeURIComponent(this.httpPeerId)}`,
        { method: 'POST', body, keepalive },
      )
        .then((res) => {
          // 409: sunucu bizi odada görmüyor (akış kopmuş). Akışı yeniden
          // kurup mesajı bir kez daha gönderiyoruz; yoksa bu mesaj kaybolur
          // ve karşı taraf sonsuza kadar bekler.
          if (res.status === 409 && !this.closedByUs) {
            this.connectHttp(base);
            setTimeout(() => {
              if (!this.closedByUs) this.post(msg, target);
            }, RESEND_DELAY_MS);
          }
        })
        .catch(() => {
          /* ağ hatası: EventSource yeniden bağlanır, duyuru tekrarı toparlar */
        });
      return;
    }

    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(body);
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

  /** Aktarıcı odadaki eşleri sürekli bildirir; liste güncel. */
  isPeerConnected(peerId: PeerId): boolean {
    return this.knownPeers.has(peerId);
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
      const open = this.useHttp
        ? this.stream?.readyState === EventSource.OPEN
        : this.socket?.readyState === WebSocket.OPEN;
      this.diagnosticsCb({
        strategy: this.useHttp ? 'relay-http' : this.kind,
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
    this.stopAnnounceRetry();
    if (this.onVisible) {
      document.removeEventListener('visibilitychange', this.onVisible);
      window.removeEventListener('focus', this.onVisible);
      this.onVisible = null;
    }
    if (this.isHost) this.broadcast({ type: 'hostLeft' });
    this.clearWatchdog();
    this.socket?.close();
    this.socket = null;
    this.stream?.close();
    this.stream = null;
    this.hostPeerId = null;
    this.knownPeers.clear();
    this.stateCb('closed');
  }
}
