# Bite Club — Vampir Köylü

Host-otoriter, sunucusuz sosyal çıkarım oyunu. Bir kişi oda kurar, link
paylaşır, herkes kendi telefonundan bağlanır. Aynı odada ya da uzaktan
oynanır; gece/gündüz anlatımını oyunun kendisi yapar, ayrı bir sunucuya
ihtiyaç yok.

- Oyun: <https://biteclub.lampwickgames.com>
- Stüdyo: <https://lampwickgames.com>

**Moderatör bir LLM değil.** Kural mantığı `src/game/` içindeki
deterministik durum makinesidir — aynı girdi her zaman aynı sonucu verir,
hiçbir yapay zekâ çağrısı yoktur. Bu bilerek böyle: bir parti oyununda
kuralın tartışmasız olması gerekiyor.

## Hızlı Başlangıç

```bash
npm install
npm run dev
```

Tek başına denemek için: ana ekranda isim yaz → **Tek cihazda dene** →
lobide **Bot ekle** ile 4 bot ekle → **Oyunu Başlat**.
Ayrıntılı test adımları: [docs/TESTING.md](docs/TESTING.md).

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme sunucusu (telefondan da erişilebilir) |
| `npm test` | Oyun motoru + ağ + görünüm filtresi testleri |
| `npm run lint:strings` | Hardcoded metin taraması (i18n kuralı) |
| `npm run build` | Üretim derlemesi (`dist/`) |
| `npm run lint:build` | Pakette yerel adres var mı, reklamlar demo mu canlı mı |
| `npm run check` | Dördü birden — yayın öncesi kapı |

## Kesinleşen Kararlar

| Konu | Karar |
|---|---|
| Platform | Tek kod tabanı: Web + Capacitor ile Android (iOS planlanıyor). Mobil öncelikli tasarım. |
| Ağ katmanı | Varsayılan `relay`: Cloudflare Worker + Durable Object. Aktarıcıya ulaşılamazsa Trystero (WebRTC P2P) yedeği devreye girer. |
| Otorite | Oyun mantığı yalnız host cihazında çalışır. Her oyuncuya giden state filtrelenir; kimsenin rolü yetkisiz istemciye gönderilmez. |
| Ağ soyutlaması | `NetworkAdapter` arayüzü. Oyun motoru hangi taşımanın kullanıldığını bilmez. |
| Roller | 11 rol. Webde 4'ü ücretsiz, uygulamada 8, premium ile hepsi (`src/game/unlocks.ts`). |
| Para kazanma | **Aktif.** Oyun sonu geçiş reklamı, bir oyunluk premium açan ödüllü reklam, tek seferlik `premium_roles` satın alması. `entitlements.ts` tek kapı. |
| Dil | Baştan i18n. Hardcoded metin yasak, `npm run lint:strings` bunu zorluyor. tr + en. |

## Kod Yapısı

```
src/
  game/           Oyun motoru: durum makinesi, roller, kazanma koşulları,
                  görünüm filtresi. UI'dan bağımsız, Vitest ile test edilir.
  net/            NetworkAdapter arayüzü, RelayAdapter (Worker),
                  TrysteroAdapter (P2P), LocalAdapter (tek cihaz), mesaj tipleri
  store/          hostController (oyun mantığı host'ta), zustand store'ları
  ui/             Ekranlar: Home, Lobby, RoleReveal, Night, Narration, Day,
                  Vote, Result
  i18n/           tr/en JSON dosyaları + üslup notları
  audio/          Howler ses yöneticisi, Web Speech TTS
  monetization/   entitlements (tek kapı), billing (Play), adGate (AdMob), adUnits
  util/           kimlik/oda kodu, derin link, platform tespiti
worker/           Cloudflare Worker: statik dosyalar + oda aktarıcısı
site/             lampwickgames.com tanıtım sitesi (ayrı Worker)
android/          Capacitor kabuğu
```

## Dosya Rehberi

- `01-architecture.md` — Teknik mimari, host-otoriter model
- `02-game-flow.md` — Durum makinesi: lobi → gece → gündüz → oylama → sonuç
- `03-roles.md` — Roller ve yeni rol ekleme şablonu
- `04-i18n.md` — Dil dosyası yapısı, üslup notları
- `05-monetization.md` — Reklam ve satın alma tasarımı
- `06-assets.md` — Görsel/ses üretim listesi
- `07-tasks.md` — Milestone durumu
- `CLAUDE.md` — Claude Code'un her oturumda okuyacağı proje kuralları
- `docs/TESTING.md` — Gerçek cihazlarla test senaryoları
- `docs/DEPLOY.md` — Cloudflare Workers'a yayınlama
- `docs/NATIVE.md` — Capacitor, derin link, mağaza hazırlığı
- `docs/PLAY-STORE.md` — Mağaza girişi, kapalı test, ürün ve AdMob kimlikleri
- `docs/SITE.md` — Tanıtım sitesinin yayını
- `docs/ASSET-PROMPTS.md` — Görsel/ses üretimi için hazır prompt'lar

## Lisans ve kullanım

**Bu depo şeffaflık için açıktır, yeniden dağıtım için değil.**

Kaynak kod herkese açık okunabilir: nasıl çalıştığını inceleyebilir,
öğrenebilir, hatalarını bildirebilirsiniz. Ancak kod açık kaynak
**lisanslı değildir** — ayrı bir lisans dosyası yoksa tüm hakları
saklıdır. Kopyalayıp kendi oyununuz olarak yayınlamak, mağazaya
sürmek ya da ticari olarak kullanmak için yazılı izin gerekir.

Ayrıntı: [LICENSE](LICENSE).

Bağımlılıklar bu kuralın dışındadır; her biri kendi lisansıyla gelir
(`node_modules` altındaki lisans dosyalarına bakın).

Hata bulursanız [Issues](https://github.com/gkc91/Vampire-Villager/issues)
üzerinden bildirin — memnun olurum.
