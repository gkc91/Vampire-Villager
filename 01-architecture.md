# 01 — Teknik Mimari

## Genel Yapı: Tek Kod Tabanı, İki Hedef

```
[ React + TypeScript + Vite ]  →  Web / PWA   (link paylaş, tarayıcıdan oyna)
                               →  Capacitor    (native iOS + Android kabuk)
```

Neden bu yol:
- "Link paylaş, bağlan" akışı web'in doğal davranışı. Native taraf aynı kodu
  Capacitor kabuğunda çalıştırır; deep link (`vampirkoylu://join/ODA123` ve
  `https://.../join/ODA123`) ile linkten native uygulamaya düşülür.
- Mobil öncelikli: tüm UI 380–430px genişlik baz alınarak tasarlanır,
  masaüstü sadece ortalanmış geniş versiyondur.
- WebRTC (Trystero) hem tarayıcıda hem Capacitor WebView'da çalışır.

## Teknoloji Listesi

| Katman | Seçim | Not |
|---|---|---|
| UI | React 18 + TypeScript | |
| Build | Vite | |
| Stil | Tailwind CSS | Mobil-first |
| State | Zustand | Oyun durumu tek store |
| Ağ | Trystero — varsayılan `@trystero-p2p/nostr` | P2P, sıfır maliyet |
| Native kabuk | Capacitor 6 | iOS + Android |
| i18n | i18next + JSON dosyaları | bkz. 04-i18n.md |
| Ses | Howler.js | Ambiyans + SFX |
| TTS (opsiyonel) | Web Speech API | Moderatör sesli anlatımı, cihaz-yerel, bedava |
| Barındırma | Cloudflare Pages veya GitHub Pages | Statik, bedava, sınırsız |

## Host-Otoriter Model (DEĞİŞMEZ PRENSİP)

- Oyun mantığının TAMAMI host cihazında çalışır (state machine, rol dağıtımı,
  oy sayımı, kazanma kontrolü).
- Diğer oyuncular "ince istemci"dir: host'a aksiyon gönderir
  (`vote`, `nightAction`, `ready`), host'tan kendilerine özel görünüm alır.
- Her oyuncuya giden state, o oyuncunun görmeye YETKİLİ olduğu kadarıyla
  filtrelenir (vampir kimlikleri vs. asla herkese yayınlanmaz).
  P2P'de paket dinlense bile başka oyuncunun rolü sızmamalı.
- Rastgelelik (rol dağıtımı) yalnızca host'ta üretilir.

## Ağ Katmanı Soyutlaması

```ts
// src/net/NetworkAdapter.ts
interface NetworkAdapter {
  createRoom(roomId: string): Promise<void>;        // host
  joinRoom(roomId: string): Promise<void>;          // oyuncu
  sendToHost(msg: ClientMessage): void;
  sendToPlayer(playerId: string, msg: ServerMessage): void; // yalnız host
  broadcast(msg: ServerMessage): void;              // yalnız host
  onMessage(cb): void;
  onPeerJoin(cb): void;
  onPeerLeave(cb): void;
}
```

- İlk implementasyon: `TrysteroAdapter`.
- Sinyalleşme (iki cihazın birbirini bulması) halka açık relay'ler üzerinden
  yapılır; oyun verisi oradan geçmez. NAT aşımı için ücretsiz STUN sunucuları
  kullanılır. Geliştiriciye fatura çıkmaz, API anahtarı ya da hesap gerekmez.
- Trystero 0.25'ten itibaren stratejiler ayrı paketlere bölündü.
  Varsayılan **nostr** (`@trystero-p2p/nostr`): 46 halka açık relay, kalıcı
  WebSocket pub/sub. `torrent` ve `mqtt` yedek olarak kurulu; `.env` içindeki
  `VITE_P2P_STRATEGY` ile değiştirilir (dinamik import, yalnız seçilen
  strateji indirilir).
- **Ölçüm (aynı makine, iki sekme, lobiye düşme süresi):**
  nostr ≈ 1 sn, torrent ≈ 17 sn. Torrent tracker'larının bir kısmı ölü ve
  keşif announce aralığına bağlı olduğu için yavaş.
- **Mobil veri: saha testinde ÇALIŞIYOR.** Başta mobil veriden hiç bağlantı
  kurulamıyordu; sebep sanılanın aksine CGNAT değil, operatörün BitTorrent
  tracker trafiğini engellemesiydi. `nostr` stratejisine geçilince gerçek
  telefonla mobil veriden hızlı bağlanıldığı doğrulandı.
  → Mobil erişilebilirliği belirleyen şey sinyalleşme yöntemi seçimidir.
- **TURN kancası hazır ama kapalı.** Bazı ağlarda (simetrik NAT) STUN
  yetmeyebilir. Hesap gerektirmeyen kamuya açık TURN artık YOK:
  `openrelay.metered.ca` tarayıcıda ölçüldü, 0 aktarıcı adayı döndürüyor.
  `.env` içindeki `VITE_TURN_URLS`/`USERNAME`/`CREDENTIAL` doldurulursa
  Trystero'nun STUN listesine eklenir (`src/net/ice.ts`). Ücretli/hesaplı
  bir TURN sağlayıcısına geçmek ayrı bir karar konusudur.
- Bağlantı kurulamadığında kullanıcıya teşhis paneli gösterilir: kaç sinyal
  sunucusuna bağlanıldığı, kaç cihaz bulunduğu ve cihazın STUN/TURN
  yeteneği. Böylece sorun "ağ engeli / eş bulunamıyor / veri kanalı" olarak
  ayırt edilir.
- İleride gerekirse `SupabaseAdapter` yazılır (ücretsiz katman); oyun kodu
  değişmez, sadece adapter değişir. Host-otoriter mantık orada da korunur
  (Supabase yalnızca mesaj taşıyıcı olur, mantık yine host'ta).

## Bağlantı Dayanıklılığı (kritik)

- Her istemci `playerToken` (localStorage) tutar → kopunca aynı odaya aynı
  kimlikle döner, rolü ve durumu host'tan geri alır.
- Host, kopan oyuncuyu 90 sn "askıda" tutar; dönemezse oyuncu "terk etti"
  sayılır ve moderatör anlatımına işlenir.
- Host cihaz uyarıları:
  - Telefonda host: Wake Lock API ile ekran uykusu engellenir; ekran yine de
    kapanırsa oyun duraklar, uyarı gösterilir.
  - Lobi ekranında "Host olarak bilgisayar/tablet önerilir" notu.
- Host koparsa: MVP'de oyun sonlanır ("Anlatıcı kayboldu" ekranı).
  Host devri (migration) MVP sonrası backlog'da.

## Güvenlik Notları

- Oda kodu: 6 karakter, tahmin edilebilirliğe karşı yeterli (hobi ölçeği).
- Rol bilgisi yalnız ilgili oyuncuya şifreli P2P kanaldan gider
  (WebRTC DTLS zaten şifreli).
- Hile riski (host oyuncuysa tüm rolleri görebilir): masaüstü oyundaki
  "moderatör her şeyi bilir" durumuyla aynı — host'un aynı zamanda oyuncu
  OLMAMASI önerilir; ayar olarak "host oyuncu mu / sadece anlatıcı mı"
  seçeneği konur. Host oyuncuysa bu sosyal güven meselesidir, teknik çözüm
  MVP dışıdır.

## Klasör Yapısı (hedef)

```
src/
  net/            NetworkAdapter, TrysteroAdapter, mesaj tipleri
  game/           stateMachine.ts, roles/, actions/, winConditions.ts
  store/          zustand store (host + client ayrımı)
  ui/             ekranlar: Lobby, RoleReveal, Night, Day, Vote, Result
  i18n/           tr.json, en.json, index.ts
  monetization/   entitlements.ts (yer tutucu)
  audio/          ses yöneticisi
public/assets/    görseller, sesler
```
