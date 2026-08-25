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
/** /stream/KOD (SSE, sunucu→istemci) ve /send/KOD (POST, istemci→sunucu). */
const HTTP_PATH = /^\/(stream|send)\/([A-Z0-9]{4,12})$/i;

/**
 * Aktarıcı adresi herkese açık olduğu için ücretsiz kota başkası tarafından
 * kullanılabilir. Yalnız siteyi sunan origin'den (ve yerel geliştirmeden)
 * gelen bağlantıları kabul ediyoruz; ileride özel alan adı bağlanırsa
 * aynı-origin kuralı onu da kapsar. Origin başlığı olmayan istekler native
 * kabuktan (Capacitor) gelir ve serbesttir.
 */
const LOCAL_ORIGIN_PREFIXES = [
  'http://localhost',
  'http://127.0.0.1',
  'capacitor://',
  'ionic://',
];

function isAllowedOrigin(origin: string | null, requestUrl: string): boolean {
  if (!origin) return true; // native kabuk
  if (LOCAL_ORIGIN_PREFIXES.some((p) => origin.startsWith(p))) return true;
  try {
    const originHost = new URL(origin).hostname;
    const selfHost = new URL(requestUrl).hostname;
    return originHost === selfHost || originHost.endsWith('.workers.dev');
  } catch {
    return false;
  }
}

/** SSE ölçüm yanıtı — tek olay, sonra akış kapanır. */
const SSE_PROBE_PAYLOAD = 'data: ok\n\n';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const match = url.pathname.match(ROOM_PATH);

    // HTTP taşıması: WebSocket'i engelleyen ağlar için ikinci kapı.
    // Aynı odaya (aynı Durable Object) düşer, protokol birebir aynıdır.
    const httpMatch = url.pathname.match(HTTP_PATH);
    if (httpMatch) {
      if (!isAllowedOrigin(request.headers.get('Origin'), request.url)) {
        return new Response('origin not allowed', { status: 403 });
      }
      const id = env.ROOMS.idFromName(httpMatch[2].toUpperCase());
      const response = await env.ROOMS.get(id).fetch(request);
      // Site aktarıcıyla farklı origin'deyse (geliştirme: 5173 ↔ 8787, ya da
      // siteyi başka yere taşırsan) EventSource ve POST CORS ister.
      // Origin süzgecinden zaten geçtik; burada yalnız izni bildiriyoruz.
      const origin = request.headers.get('Origin');
      if (origin) {
        const withCors = new Response(response.body, response);
        withCors.headers.set('access-control-allow-origin', origin);
        return withCors;
      }
      return response;
    }

    if (match) {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('expected websocket', { status: 426 });
      }
      if (!isAllowedOrigin(request.headers.get('Origin'), request.url)) {
        return new Response('origin not allowed', { status: 403 });
      }
      const roomId = match[1].toUpperCase();
      const id = env.ROOMS.idFromName(roomId);
      return env.ROOMS.get(id).fetch(request);
    }

    /**
     * Teşhis: uzun ömürlü bir HTTP akışı (SSE) açılabiliyor mu?
     *
     * Bir cihazda HTTPS çalışıp WebSocket açılmıyorsa (gerçek vaka: kod
     * 1006) engelin WebSocket'e mi özel olduğunu bilmek gerekir. SSE
     * geçiyorsa oyunu o cihaza HTTP üzerinden taşımak mümkün demektir;
     * SSE de geçmiyorsa o ağda yapılabilecek bir şey yoktur.
     */
    if (url.pathname === '/probe/sse') {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(SSE_PROBE_PAYLOAD));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: {
          'content-type': 'text/event-stream',
          'cache-control': 'no-store',
          'access-control-allow-origin': '*',
        },
      });
    }

    // Diğer her şey statik site (aynı Worker'dan servis ediliyorsa).
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('not found', { status: 404 });
  },
};

/**
 * Sahadaki arızaları uzaktan görebilmek için olay günlüğü.
 *
 * Yalnız YAŞAM DÖNGÜSÜ olayları yazılır (bağlanma, kopma, hedefi bulunamayan
 * mesaj) — her mesajı yazmak hem gürültü hem masraf olurdu. Oyun içeriği
 * ASLA yazılmaz: roller ve görünümler loglara düşmemeli.
 */
function logEvent(room: string, event: string, detail?: Record<string, unknown>): void {
  const extra = detail ? ' ' + JSON.stringify(detail) : '';
  console.log(`[oda ${room}] ${event}${extra}`);
}

export class GameRoom implements DurableObject {
  constructor(private state: DurableObjectState) {
    // Boşta duran WebSocket'leri ara sunucular (operatör/proxy) kapatabiliyor.
    // Bu otomatik yanıt, DO'yu uyandırmadan ping'e pong döner: bağlantı
    // canlı kalır ve ücretlendirmeye girmez.
    this.state.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  /**
   * HTTP taşıması için açık SSE akışları: peerId → akış denetleyicisi.
   *
   * WebSocket'ten farkı, hibernation'a girememesidir; akış açık kaldığı
   * sürece DO uyanık durur. Bu yüzden yalnız WebSocket açılamayan
   * cihazlar bu yola düşer, herkes değil.
   */
  private streams = new Map<string, ReadableStreamDefaultController<Uint8Array>>();
  /** Yalnız log okunabilirliği için; yönlendirmede kullanılmaz. */
  private roomLabel = '?';
  private encoder = new TextEncoder();
  private keepAlive: ReturnType<typeof setInterval> | null = null;

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    this.roomLabel = url.pathname.split('/')[2] ?? '?';
    // HTTP taşımasında peerId'yi istemci taşır: akış koptuğunda aynı kimlikle
    // dönebilsin diye. (WebSocket'te sunucu atar, orada kopma = yeni kimlik.)
    const httpPeer = url.searchParams.get('peer');

    if (url.pathname.startsWith('/stream/')) {
      if (!httpPeer) return new Response('peer required', { status: 400 });
      return this.openStream(httpPeer);
    }

    if (url.pathname.startsWith('/send/')) {
      if (!httpPeer) return new Response('peer required', { status: 400 });
      if (!this.streams.has(httpPeer)) {
        // Akış kopmuş: istemci yeniden bağlanmalı, mesajı sessizce yutma.
        logEvent(this.roomLabel, 'POST reddedildi (akış yok)', { peer: httpPeer.slice(0, 8) });
        return new Response('stream gone', { status: 409 });
      }
      let envelope: ClientEnvelope;
      try {
        envelope = JSON.parse(await request.text()) as ClientEnvelope;
      } catch {
        return new Response('bad json', { status: 400 });
      }
      if (typeof envelope.data !== 'string') return new Response('bad envelope', { status: 400 });
      this.route(httpPeer, envelope);
      return new Response(null, { status: 204 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const peerId = crypto.randomUUID().slice(0, 8);
    // Hibernation: bağlantı uyurken bile peerId etiketten geri okunur.
    this.state.acceptWebSocket(server, [peerId]);

    const others = this.allPeerIds().filter((id) => id !== peerId);
    logEvent(this.roomLabel, 'WebSocket bağlandı', { peer: peerId, odadakiler: others.length });
    this.send(server, { t: 'welcome', peerId, peers: others });
    for (const id of others) {
      this.sendTo(id, { t: 'peerJoin', peerId });
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  /** SSE akışı açar; WebSocket'teki karşılama/duyuru akışının aynısı. */
  private openStream(peerId: string): Response {
    // Aynı peer yeniden bağlanıyorsa eski akışı bırak (kimlik korunur).
    const previous = this.streams.get(peerId);
    if (previous) {
      this.streams.delete(peerId);
      try {
        previous.close();
      } catch {
        /* zaten kapalı */
      }
    }

    const room = this;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        room.streams.set(peerId, controller);
        const others = room.allPeerIds().filter((id) => id !== peerId);
        logEvent(room.roomLabel, 'HTTP akışı açıldı', {
          peer: peerId.slice(0, 8),
          odadakiler: others.length,
        });
        room.sendTo(peerId, { t: 'welcome', peerId, peers: others });
        for (const id of others) room.sendTo(id, { t: 'peerJoin', peerId });
        room.startKeepAlive();
      },
      cancel() {
        logEvent(room.roomLabel, 'HTTP akışı kapandı', { peer: peerId.slice(0, 8) });
        room.streams.delete(peerId);
        for (const id of room.allPeerIds()) room.sendTo(id, { t: 'peerLeave', peerId });
        if (room.streams.size === 0) room.stopKeepAlive();
      },
    });

    return new Response(stream, {
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-store',
        connection: 'keep-alive',
        // Ara sunucuların akışı tamponlamasını engeller.
        'x-accel-buffering': 'no',
      },
    });
  }

  /**
   * Boşta duran SSE akışlarını ara sunucular kesebiliyor; yorum satırı
   * göndermek bağlantıyı canlı tutar (istemciye olay olarak görünmez).
   */
  private startKeepAlive(): void {
    if (this.keepAlive) return;
    this.keepAlive = setInterval(() => {
      for (const [id, controller] of this.streams) {
        try {
          controller.enqueue(this.encoder.encode(': ping\n\n'));
        } catch {
          this.streams.delete(id);
        }
      }
    }, 20000);
  }

  private stopKeepAlive(): void {
    if (!this.keepAlive) return;
    clearInterval(this.keepAlive);
    this.keepAlive = null;
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
    this.route(from, envelope);
  }

  /** İki taşımadan da gelen mesajlar buradan dağıtılır. */
  private route(from: string, envelope: ClientEnvelope): void {
    const payload: ServerEnvelope = { t: 'msg', from, data: envelope.data };

    if (envelope.to) {
      // Hedefli: yalnız o istemciye. Gizli bilgi (rol görünümü) bu yoldan gider.
      this.sendTo(envelope.to, payload);
      return;
    }

    for (const id of this.allPeerIds()) {
      if (id !== from) this.sendTo(id, payload);
    }
  }

  /** Her iki taşımadaki eşler. */
  private allPeerIds(): string[] {
    return [...this.peers().map((p) => p.peerId), ...this.streams.keys()];
  }

  /** Hedef hangi taşımadaysa oradan gönderir. */
  private sendTo(peerId: string, payload: ServerEnvelope): void {
    const controller = this.streams.get(peerId);
    if (controller) {
      try {
        controller.enqueue(this.encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      } catch {
        this.streams.delete(peerId);
      }
      return;
    }
    const target = this.peers().find((p) => p.peerId === peerId);
    if (target) {
      this.send(target.socket, payload);
      return;
    }
    // Buraya düşmek, mesajın DÜŞTÜĞÜ anlamına gelir: hedef odada görünmüyor.
    // "Host beni gördü ama ben bağlanıyorda kaldım" şikâyetinin izi budur.
    logEvent(this.roomLabel, 'HEDEF BULUNAMADI — mesaj düştü', {
      hedef: peerId.slice(0, 8),
      tur: payload.t,
      odadakiler: this.allPeerIds().length,
    });
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
    logEvent(this.roomLabel, 'WebSocket koptu', { peer: peerId });
    for (const id of this.allPeerIds()) {
      if (id !== peerId) this.sendTo(id, { t: 'peerLeave', peerId });
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
