# 06 — Asset Üretim Listesi (Banana + Suno Checklist)

> **Hazır prompt'lar: [docs/ASSET-PROMPTS.md](docs/ASSET-PROMPTS.md)** —
> her dosya için kopyala-yapıştır prompt, stil tutarlılığı yöntemi,
> boyutlandırma/webp dönüştürme komutları ve CC0 SFX kaynakları.

Görseller Banana (Gemini) ile, müzikler Suno ile kullanıcı tarafından üretilecek.
Format ve boyutlar buradaki gibi olmalı; dosyalar `public/assets/` altına
buradaki isimlerle konacak. Claude Code, eksik asset varsa düz renkli
placeholder ile ilerler, oyunu bloke etmez.

## Görseller (PNG veya WebP)

Ortak stil önerisi: karanlık gotik köy, hafif çizgi-roman/illüstrasyon tadı,
mor-lacivert palet + kan kırmızısı vurgu. Tüm rol kartları aynı stilde olmalı
(Banana'da ilk beğendiğin kartı referans görsel olarak verip "aynı stilde"
diye devam etmen tutarlılığı sağlar).

| Dosya | Boyut | İçerik |
|---|---|---|
| `roles/vampire.webp` | 512×768 | Vampir rol kartı illüstrasyonu |
| `roles/villager.webp` | 512×768 | Köylü |
| `roles/seer.webp` | 512×768 | Kâhin (kristal küre / fal) |
| `roles/doctor.webp` | 512×768 | Doktor / şifacı |
| `roles/hunter.webp` | 512×768 | Avcı (tüfek/yay) |
| `bg/night.webp` | 1080×1920 (dikey) | Gece köy manzarası, dolunay |
| `bg/day.webp` | 1080×1920 | Gündüz köy meydanı |
| `bg/lobby.webp` | 1080×1920 | Köy girişi / tabela |
| `bg/death.webp` | 1080×1920 | Ölüm duyuru arka planı (mezarlık) |
| `icon/app-icon.png` | 1024×1024 | Uygulama ikonu (kurt/vampir silüeti + ay) |
| `icon/favicon.png` | 512×512 | Web ikon (app-icon'dan kırpılabilir) |
| `ui/tombstone.webp` | 256×256 | Ölü oyuncu işareti — *henüz koda bağlı değil* |
| `ui/fang.webp` | 256×256 | Vampir takım simgesi — *henüz koda bağlı değil* |
| `ui/sun.webp` | 256×256 | Köy takım simgesi — *henüz koda bağlı değil* |

`ui/` altındaki üç ikon şu an hiçbir ekranda kullanılmıyor; üretmeden önce
koda bağlanmaları gerekiyor. Diğer 11 görsel doğrudan devreye girer.

Avatarlar: MVP'de görsel avatar yok, baş harfli renkli daireler (kodla üretilir).
Faz-2'de 12'lik köylü avatar seti eklenebilir.

## Sesler

Müzik (Suno, loop edilebilir, enstrümantal, 60–90 sn, MP3):

| Dosya | İçerik |
|---|---|
| `audio/music/lobby.mp3` | Hafif tekinsiz ama neşeli köy müziği |
| `audio/music/night.mp3` | Gerilimli, yavaş, ambient gece teması |
| `audio/music/day.mp3` | Tartışma temposu, tık tık ilerleyen gerilim |
| `audio/music/win_village.mp3` | Zafer fanfarı (kısa, 15–20 sn) |
| `audio/music/win_vampires.mp3` | Karanlık zafer teması (15–20 sn) |

SFX (Suno uygun değil; ücretsiz kaynak: freesound.org / pixabay, CC0 seçilmeli):

| Dosya | İçerik |
|---|---|
| `audio/sfx/wolf_howl.mp3` | Gece başlangıcı ulumas |
| `audio/sfx/rooster.mp3` | Sabah horozu |
| `audio/sfx/bell.mp3` | Oylama çanı |
| `audio/sfx/death.mp3` | Ölüm vurgusu (kısa sting) |
| `audio/sfx/click.mp3` | Buton sesi |
| `audio/sfx/heartbeat.mp3` | Süre daralınca kalp atışı |

Lisans notu: SFX indirirken CC0/royalty-free olduğunu kontrol et; kaynak
linklerini `assets/CREDITS.md` dosyasına yaz (yayınlarken lazım olur).
