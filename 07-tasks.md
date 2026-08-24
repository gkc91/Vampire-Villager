# 07 — Claude Code Görev Sırası

Her milestone tek başına test edilebilir biter. Sıra atlanmaz — özellikle M2
(ağ) stabil olmadan M4+ anlamsızdır. Her milestone sonunda kullanıcıya
"nasıl test edeceği" anlatılır.

> Durum: M0–M5 kodlandı, M6 iskeleti hazır (native derleme kullanıcı
> makinesinde yapılır). Test adımları: `docs/TESTING.md`.

## M0 — Proje İskeleti ✅
- [x] Vite + React + TS + Tailwind + Zustand kurulumu
- [x] i18next kurulumu, tr/en dosyaları, dil algılama + değiştirme
- [x] Klasör yapısı (01-architecture.md'deki gibi)
- [x] Hardcoded string lint scripti (`npm run lint:strings`)
- [x] Deploy pipeline (`.github/workflows/deploy.yml` — GitHub Pages hazır,
      Cloudflare Pages secret girilince devreye girer, bkz. docs/DEPLOY.md)
- Test: boş uygulama telefonda açılıyor, dil değişiyor.

## M1 — Lobi ve Oda ✅
- [x] Oda kur / kod+link üret / linkten katıl akışı
- [x] İsim girme, oyuncu listesi, hazır durumu, host ayarları ekranı
- [x] playerToken üretimi (localStorage) + aynı cihazda ikinci oturum koruması
- [x] "Tek cihazda dene" modu (LocalAdapter + botlar)
- Test: solo modda lobi ve tam oyun tek cihazda oynanabiliyor.

## M2 — Ağ Katmanı ✅
- [x] NetworkAdapter arayüzü + TrysteroAdapter (+ LocalAdapter)
- [x] Host-otoriter mesaj protokolü (ClientMessage/ServerMessage)
- [x] Katıl/ayrıl/yeniden bağlan (90 sn askı kuralı)
- [x] Filtreli state yayını (her oyuncu yalnız kendi görünümünü alır)
- [x] Kimlik gaspı koruması (token ↔ peer eşleşmesi, host kimliği yerel)
- [x] Sinyalleşme yöntemi seçilebilir (nostr varsayılan) + bağlantı teşhis paneli
- Test: 5 sekmeyle tam oyun P2P üzerinden oynandı; gerçek telefonla
      **WiFi ve mobil veriden hızlı bağlantı doğrulandı**. Kalan senaryo:
      uçak modu / 90 sn geri dönüş — docs/TESTING.md §4.

## M3 — Oyun Motoru ✅
- [x] stateMachine.ts: 02-game-flow.md'deki tüm durumlar
- [x] 5 rol implementasyonu (03-roles.md şablonuyla)
- [x] Çözümleme sırası, kazanma koşulları, Avcı son-ok, doktor kısıtı
- [x] Vitest kural testleri (eşitlik, pas, kopma senaryoları dahil)
- [x] 100 rastgele simüle oyun çökmüyor
- Test: `npm test` → 56 test yeşil.

## M4 — Oyun UI ✅
- [x] RoleReveal, Night, Day, Vote, Hunter, Result ekranları
- [x] Ölü/hayalet görünümü
- [x] Anlatım bantları (i18n anahtarlarıyla)
- [x] Reklam yer tutucu geçişi + entitlements iskeleti (05-monetization.md)
- Test: 5 gerçek cihazla baştan sona bir oyun — docs/TESTING.md §3.

## M5 — Ses, Görsel, Cila ✅
- [x] Howler ile müzik/SFX entegrasyonu (asset yoksa sessiz geç)
- [x] Asset yolları 06-assets.md isimleriyle bağlandı; eksikse placeholder
- [x] Opsiyonel TTS anlatıcı (Web Speech API, ayarlardan aç/kapa)
- [x] Wake Lock, "host bilgisayar önerilir" uyarısı
- [x] PWA manifest + service worker (ana ekrana ekle)
- Not: görsel/ses dosyalarını kullanıcı üretecek (06-assets.md listesi).

## M6 — Native (Capacitor) — iskelet hazır
- [x] Capacitor bağımlılıkları + `capacitor.config.ts`
- [x] Derin link yakalama (`src/util/deepLink.ts`)
- [x] Store hazırlık notları + AndroidManifest intent-filter reçetesi
      (docs/NATIVE.md)
- [ ] `npx cap add android` + gerçek cihazda APK — Android Studio/JDK
      gerektirir, kullanıcının makinesinde yapılacak
- [ ] iOS (macOS + Xcode gerekir)

## Backlog (MVP sonrası, sırasız)
- Host devri (host koparsa oyun ölmesin)
- Faz-2 roller (kullanıcının 14'lük seti işlendikten sonra)
- Oylama eşitliğinde runoff seçeneği
- Avatar seti, oyun geçmişi/istatistik
- SupabaseAdapter (P2P sorun çıkaran ağlar için)
- Reklam/premium aktivasyonu (ayrı karar oturumu gerektirir)
