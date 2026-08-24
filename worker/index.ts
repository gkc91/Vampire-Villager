/**
 * Oda aktarıcısı (Cloudflare Durable Object).
 *
 * Bu sunucu oyunun KURALLARINI BİLMEZ. Yalnız mesaj taşır: her odaya bir
 * Durable Object düşer, bağlanan her istemciye bir peerId verilir, mesajlar
 * ya tek bir hedefe ya da odadaki herkese iletilir.
 *
 * Host-otoriter model aynen korunur (01-architecture.md): oyun mantığı ve
 * rol dağıtımı hâlâ yalnız host cihazında çalışır, sunucu sadece kanaldır.
 * Bu yüzden P2P ile aktarıcı arasında geçiş tek dosyalık bir adapter
 * değişikliğidir; motor ve gizlilik filtresi hiç değişmez.
 *
 * Maliyet: WebSocket Hibernation API kullanılıyor — boşta duran bağlantılar
 * uyutuluyor, süre ücreti işlemiyor. Ücretsiz planda kalır.
 */

export interface Env {
  ROOMS: DurableObjectNamespace;
  ASSETS: Fetcher;
}

/** Sunucudan istemciye giden zarf. */
type ServerEnvelope =
  | { t: 'welcome'; peerId: string; peers: string[] }
  | { t: 'peerJoin'; peerId: string }
  | { t: 'peerLeave'; peerId: string }
  | { t: 'msg'; from: string; data: string };

/** İstemciden sunucuya giden zarf. */
interface ClientEnvelope {
  /** Hedef peerId; yoksa odadaki herkese gider. */
  to?: string;
  data: string;
}

const ROOM_PATH = /^\/room\/([A-Z0-9]{4,12})$/i;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const match = url.pathname.match(ROOM_PATH);

    if (match) {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('expected websocket', { status: 426 });
      }
      const roomId = match[1].toUpperCase();
      const id = env.ROOMS.idFromName(roomId);
      return env.ROOMS.get(id).fetch(request);
    }

    // Diğer her şey statik site (aynı Worker'dan servis ediliyorsa).
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('not found', { status: 404 });
  },
};

export class GameRoom implements DurableObject {
  constructor(private state: DurableObjectState) {
    // Boşta duran WebSocket'leri ara sunucular (operatör/proxy) kapatabiliyor.
    // Bu otomatik yanıt, DO'yu uyandırmadan ping'e pong döner: bağlantı
    // canlı kalır ve ücretlendirmeye girmez.
    this.state.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(_request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const peerId = crypto.randomUUID().slice(0, 8);
    // Hibernation: bağlantı uyurken bile peerId etiketten geri okunur.
    this.state.acceptWebSocket(server, [peerId]);

    const others = this.peers().filter((p) => p.peerId !== peerId);
    this.send(server, { t: 'welcome', peerId, peers: others.map((p) => p.peerId) });
    for (const other of others) {
      this.send(other.socket, { t: 'peerJoin', peerId });
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    if (typeof message !== 'string') return;

    let envelope: ClientEnvelope;
    try {
      envelope = JSON.parse(message) as ClientEnvelope;
    } catch {
      return; // bozuk paket
    }
    if (typeof envelope.data !== 'string') return;

    const from = this.peerIdOf(ws);
    if (!from) return;

    const payload: ServerEnvelope = { t: 'msg', from, data: envelope.data };

    if (envelope.to) {
      // Hedefli: yalnız o istemciye. Gizli bilgi (rol görünümü) bu yoldan gider.
      const target = this.peers().find((p) => p.peerId === envelope.to);
      if (target) this.send(target.socket, payload);
      return;
    }

    for (const peer of this.peers()) {
      if (peer.socket !== ws) this.send(peer.socket, payload);
    }
  }

  webSocketClose(ws: WebSocket): void {
    this.announceLeave(ws);
  }

  webSocketError(ws: WebSocket): void {
    this.announceLeave(ws);
  }

  private announceLeave(ws: WebSocket): void {
    const peerId = this.peerIdOf(ws);
    if (!peerId) return;
    for (const peer of this.peers()) {
      if (peer.socket !== ws) this.send(peer.socket, { t: 'peerLeave', peerId });
    }
  }

  private peers(): { peerId: string; socket: WebSocket }[] {
    return this.state
      .getWebSockets()
      .map((socket) => ({ peerId: this.peerIdOf(socket), socket }))
      .filter((p): p is { peerId: string; socket: WebSocket } => Boolean(p.peerId));
  }

  private peerIdOf(ws: WebSocket): string | null {
    return this.state.getTags(ws)[0] ?? null;
  }

  private send(ws: WebSocket, payload: ServerEnvelope): void {
    try {
      ws.send(JSON.stringify(payload));
    } catch {
      // Kapanmış sokete yazma denemesi yok sayılır.
    }
  }
}
