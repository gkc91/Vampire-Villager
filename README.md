# Vampir Köylü — Mobil/Web Party Oyunu

AI moderatörlü, sunucusuz (host-otoriter), aynı odada veya Discord üzerinden oynanan
sosyal çıkarım oyunu. Bir kişi oda kurar, link paylaşır, herkes kendi cihazından bağlanır.

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
| `npm run check` | Üçü birden — yayın öncesi kapı |

## Kesinleşen Kararlar

| Konu | Karar |
|---|---|
| Platform | Tek kod tabanı: Web (PWA) + Capacitor ile native iOS/Android. Mobil öncelikli tasarım. |
| Ağ katmanı | Trystero (P2P, WebRTC). Sıfır sunucu maliyeti — oyun ne kadar tutarsa tutsun geliştiriciye masraf yok. Host cihazı otoritedir. |
| Ağ soyutlaması | `NetworkAdapter` arayüzü — ileride Supabase'e geçiş tek dosya değişikliğiyle mümkün. Host-otoriter prensip her adapterde korunur. |
| MVP roller | 5 temel rol: Vampir, Köylü, Kâhin, Doktor, Avcı. Kalan roller sonraki fazda. |
| Para kazanma | Sadece iskelet/yer tutucu. Aktif satış ve reklam YOK (hobi fazı). `entitlements.ts` tek kapı. |
| Dil | Baştan i18n. Hardcoded metin yasak. Başlangıç: tr, en. |
| Görseller | Kullanıcı Banana (Gemini) ile üretecek — bkz. 06-assets.md |
| Ses | Kullanıcı Suno ile üretecek + gerekirse ücretsiz SFX — bkz. 06-assets.md |

## Kod Yapısı

```
src/
  game/           Oyun motoru: stateMachine, roller, kazanma koşulları, görünüm filtresi
                  (UI'dan bağımsız, Vitest ile test edilir)
  net/            NetworkAdapter arayüzü, TrysteroAdapter, LocalAdapter, mesaj tipleri
  store/          hostController (oyun mantığı host'ta), zustand store'ları
  ui/             Ekranlar (Home, Lobby, RoleReveal, Night, Day, Vote, Hunter, Result)
  i18n/           tr/en JSON dosyaları + üslup notları
  audio/          Howler ses yöneticisi, Web Speech TTS
  monetization/   entitlements.ts + adGate.ts (pasif yer tutucu)
  util/           kimlik/oda kodu, derin link
public/assets/    görseller, sesler (eksikse placeholder ile çalışır)
```

## Dosya Rehberi

- `01-architecture.md` — Teknik mimari, teknoloji seçimleri, host-otoriter model
- `02-game-flow.md` — Oyun durumu makinesi: lobi → gece → gündüz → oylama → sonuç
- `03-roles.md` — MVP rolleri + yeni rol ekleme şablonu
- `04-i18n.md` — Dil dosyası yapısı, üslup notları
- `05-monetization.md` — Yer tutucu tasarımı (aktif değil)
- `06-assets.md` — Görsel/ses üretim listesi (Banana + Suno checklist)
- `07-tasks.md` — Milestone durumu
- `CLAUDE.md` — Claude Code'un her oturumda okuyacağı proje kuralları
- `docs/TESTING.md` — Gerçek cihazlarla test senaryoları
- `docs/DEPLOY.md` — GitHub Pages / Cloudflare Pages yayınlama
- `docs/NATIVE.md` — Capacitor, derin link, mağaza hazırlığı

## Eksikler

- `public/assets/` klasörü boş: görsel ve sesler 06-assets.md'deki
  isimlerle konana kadar oyun emoji/renk placeholder'larıyla çalışır.
- Native derleme (Android Studio / Xcode) kullanıcının makinesinde yapılır.
- Faz-2 roller (kullanıcının 14'lük seti) 03-roles.md'ye işlenmeyi bekliyor.
