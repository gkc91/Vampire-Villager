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
  // Capacitor'ın Android kabuğu sayfayı HTTPS üzerinden sunuyor; origin
  // tam olarak `https://localhost`. Bu satır EKSİKTİ ve sonucu şuydu:
  // yayındaki uygulama kendi aktarıcısı tarafından 403'le reddediliyordu.
  // Hem WebSocket yükseltmesi hem HTTP yedeği (SSE/POST) kapalıydı, yani
  // uygulamadan kurulan hiçbir oda çalışmıyordu. Cihazdaki teşhis paneli
  // bunu "internet kopuk" diye raporluyordu çünkü fetch CORS'tan patlıyor.
  // (6 Ekim 2026'da gerçek cihazda bulundu.)
  'https://localhost',
  'https://127.0.0.1',
  'http://localhost',
  'http://127.0.0.1',
  // iOS kabuğu ve eski Ionic kabuğu.
  'capacitor://',
  'ionic://',
];

export function isAllowedOrigin(origin: string | null, requestUrl: string): boolean {
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


/**
 * DERİN LİNK DOĞRULAMASI — paylaşılan bağlantı uygulamada açılsın diye.
 *
 * Paylaş düğmesi `https://ALAN/join/KOD` üretiyor. Bu adres bir tarayıcıda
 * açıldığında Android ve iOS, uygulamanın bu alan adını gerçekten sahiplenip
 * sahiplenmediğini ŞU İKİ DOSYADAN doğruluyor. Dosyalar yoksa sistem sessizce
 * tarayıcıya düşüyor — hata vermiyor, sadece uygulama açılmıyor. Tam olarak
 * bu oldu: WhatsApp'tan gelen bağlantı siteyi açıyordu.
 *
 * NEDEN WORKER'DAN SERVİS EDİLİYOR, public/ içinden değil:
 *   - `apple-app-site-association` UZANTISIZ bir dosya; statik servis onu
 *     doğru içerik türüyle vermiyor. Apple `application/json` bekliyor.
 *   - `not_found_handling: single-page-application` ayarı, dosya bulunamazsa
 *     index.html döndürüyor. O zaman doğrulama sessizce 200/HTML alıp
 *     başarısız oluyor — teşhisi zor bir arıza.
 * Burada ikisi de kodun içinde; içerik türü garanti ve test edilebilir.
 */
const ANDROID_PAKET = 'com.lampwickgames.biteclub';

/**
 * Play App Signing kullanıldığı için İKİ parmak izi de gerekiyor:
 *   - uygulama imzalama anahtarı: Play'den inen her kurulum bununla imzalı
 *   - yükleme anahtarı: yerelde derlenip doğrudan kurulan APK bununla imzalı
 * Yalnız ilkini yazmak, elle kurulan test paketlerinde derin linki bozar.
 * Kaynak: Play Console → Uygulama bütünlüğü → Uygulama imzalama.
 */
const ANDROID_PARMAK_IZLERI = [
  'A5:40:B4:FF:1C:A7:D2:2A:10:BA:35:2B:91:87:C6:CD:A3:D5:6F:17:AF:FA:14:0B:E2:E9:1B:68:10:D7:83:D3',
  '34:9A:F6:93:4C:20:F2:62:41:EC:B7:EC:BC:FF:24:BA:D1:BF:0A:32:A5:EA:88:85:58:2F:F1:69:B6:4F:52:EE',
];

/** Apple uygulama kimliği: <Takım kimliği>.<paket kimliği>. */
const IOS_APP_ID = `K7H463X474.${ANDROID_PAKET}`;

export const ASSETLINKS = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: ANDROID_PAKET,
      sha256_cert_fingerprints: ANDROID_PARMAK_IZLERI,
    },
  },
];

/**
 * YALNIZ `/join/*` sahipleniliyor. Alan adının tamamını (`*`) sahiplenmek
 * ana sayfayı, gizlilik ve nasıl oynanır sayfalarını da uygulamaya
 * yönlendirirdi — onların tarayıcıda açılması gerekiyor.
 */
export const AASA = {
  applinks: {
    details: [{ appIDs: [IOS_APP_ID], components: [{ '/': '/join/*', comment: 'oda daveti' }] }],
  },
};

/**
 * AdMob yetkilendirme satırı — IAB app-ads.txt.
 *
 * NEDEN BU DOSYA BURADA DA VAR: AdMob onu, mağaza girişindeki "geliştirici
 * web sitesi" alan adının KÖKÜNDE arıyor ve iki mağaza iki ayrı alan
 * gösteriyor:
 *
 *   Play girişi → lampwickgames.com          → site/public/app-ads.txt
 *   App Store   → biteclub.lampwickgames.com → BU Worker
 *
 * 24 Ekim 2026'da iOS uygulaması AdMob'a bağlanırken doğrulama tam bundan
 * düştü: `/app-ads.txt` isteğine SPA yedeği 200 + index.html döndürüyordu,
 * AdMob da "bilgileriniz eşleşmiyor" dedi. Dosya eksik değildi — HTML'di.
 * `.well-known` dosyalarındaki sessiz arızanın aynısı.
 *
 * İKİ KOPYA AYNI YAYINCI SATIRINI TAŞIMAK ZORUNDA. Biri değişirse diğeri
 * de değişmeli; worker/deepLink.test.ts ikisini karşılaştırıyor.
 */
export const APP_ADS_TXT = `# AdMob yetkilendirme — IAB app-ads.txt
#
# İkinci kopya stüdyo sitesinde: site/public/app-ads.txt. AdMob dosyayı
# mağaza girişindeki geliştirici alan adının kökünde arıyor; Play girişi
# lampwickgames.com, App Store girişi biteclub.lampwickgames.com
# gösteriyor — bu yüzden iki yerde de durması gerekiyor.
#
# Bu satır olmadan envanter "yetkilendirilmemiş" sayılıyor ve reklam
# doluluğu düşüyor.
google.com, pub-3566083608754052, DIRECT, f08c47fec0942fa0
`;

type DogrulamaDosyasi = { govde: string; tip: string };

const JSON_TIP = 'application/json';

const DOGRULAMA_DOSYALARI: Record<string, DogrulamaDosyasi> = {
  '/.well-known/assetlinks.json': { govde: JSON.stringify(ASSETLINKS, null, 2), tip: JSON_TIP },
  '/.well-known/apple-app-site-association': { govde: JSON.stringify(AASA, null, 2), tip: JSON_TIP },
  // iOS eski sürümleri kök dizinde de arıyor.
  '/apple-app-site-association': { govde: JSON.stringify(AASA, null, 2), tip: JSON_TIP },
  '/app-ads.txt': { govde: APP_ADS_TXT, tip: 'text/plain; charset=utf-8' },
};

/** Mağaza/ağ doğrulama dosyası mı? Değilse null. */
export function wellKnownResponse(pathname: string): Response | null {
  const dosya = DOGRULAMA_DOSYALARI[pathname];
  if (!dosya) return null;
  return new Response(dosya.govde, {
    headers: {
      'content-type': dosya.tip,
      // Parmak izi değişirse (anahtar sıfırlama) geç yayılmasın.
      'cache-control': 'public, max-age=300',
    },
  });
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
    /**
     * Teşhis: siteye HTTP ile ulaşılabiliyor mu?
     *
     * Statik yola istek atmak YETMİYOR: uygulamanın origin'i
     * `https://localhost`, yani her istek çapraz kaynak. Statik yanıtta
     * CORS başlığı olmadığı için `fetch` patlıyor ve panel bunu "internet
     * kopuk" diye raporluyordu — sunucu gayet ayaktayken. Bu uç, ölçümün
     * ölçmek istediği şeyi gerçekten ölçebilmesi için var.
     */
    if (url.pathname === '/probe/ping') {
      return new Response('ok', {
        headers: {
          'content-type': 'text/plain',
          'cache-control': 'no-store',
          'access-control-allow-origin': '*',
        },
      });
    }

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

    // Derin link doğrulama dosyaları statik servise DÜŞMEDEN önce.
    const dogrulama = wellKnownResponse(url.pathname);
    if (dogrulama) return dogrulama;

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
