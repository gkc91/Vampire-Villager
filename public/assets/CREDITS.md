# Asset Kaynakları

06-assets.md'deki listeye göre üretilen/indirilen dosyaların kaynakları.
Yayınlamadan (özellikle mağazaya çıkmadan) önce buranın dolu olduğundan
emin ol.

## ⚠️ Eksik / Düzeltilecek

- **`audio/sfx/wolf_howl.mp3` kaynağı yanlış.** Şu an horoz sesinin linki
  yazılı (`nature-rooster-crowing-364473`), yani uluma dosyasının gerçek
  kaynağı kayıtlı değil. Doğru Pixabay linkini bul ve aşağıdaki tabloya yaz.
- Görsel ve müzik tablolarındaki üretim tarihleri boş. Kendi ürettiğin
  içerik oldukları için lisans sorunu yok, ama hangi tarihte hangi araçla
  üretildiği not düşülürse ileride işine yarar.

## Görseller (Banana / Gemini ile üretildi)

| Dosya | Üretim tarihi | Not |
|---|---|---|
| roles/vampire.webp | | referans kart — diğerleri buna göre üretildi |
| roles/villager.webp | | |
| roles/seer.webp | | |
| roles/doctor.webp | | |
| roles/hunter.webp | | |
| roles/detective.webp | | |
| roles/wizard.webp | | |
| roles/vampireLord.webp | | |
| roles/bloodWizard.webp | | |
| roles/mistVampire.webp | | |
| roles/thief.webp | | |
| bg/night.webp | | |
| bg/day.webp | | |
| bg/lobby.webp | | |
| bg/death.webp | | |
| icon/app-icon.png | | |
| icon/favicon.png | | app-icon'dan küçültüldü |

## Müzik (Suno ile üretildi)

| Dosya | Üretim tarihi | Not |
|---|---|---|
| audio/music/lobby.mp3 | | 90 sn döngü |
| audio/music/night.mp3 | | 90 sn döngü |
| audio/music/day.mp3 | | 90 sn döngü |
| audio/music/win_village.mp3 | | 25 sn |
| audio/music/win_vampires.mp3 | | 25 sn |

## SFX (Pixabay)

Pixabay İçerik Lisansı ticari kullanıma izin verir ve atıf zorunlu değildir;
yine de kaynağı burada tutuyoruz. Sesleri olduğu gibi yeniden dağıtmak
(ör. ses paketi olarak satmak) yasaktır — oyun içinde kullanmak serbesttir.

| Dosya | Kaynak linki | Lisans |
|---|---|---|
| audio/sfx/wolf_howl.mp3 | **⚠️ eksik — aşağıdaki not** | [Pixabay](https://pixabay.com/service/license-summary/) |
| audio/sfx/rooster.mp3 | [nature-rooster-crowing-364473](https://pixabay.com/sound-effects/nature-rooster-crowing-364473/) | [Pixabay](https://pixabay.com/service/license-summary/) |
| audio/sfx/bell.mp3 | [musical-single-church-bell-156463](https://pixabay.com/sound-effects/musical-single-church-bell-156463/) | [Pixabay](https://pixabay.com/service/license-summary/) |
| audio/sfx/death.mp3 | [horror-horror-impact-hit-567238](https://pixabay.com/sound-effects/horror-horror-impact-hit-567238/) | [Pixabay](https://pixabay.com/service/license-summary/) |
| audio/sfx/click.mp3 | [film-special-effects-soft-pop-538611](https://pixabay.com/sound-effects/film-special-effects-soft-pop-538611/) | [Pixabay](https://pixabay.com/service/license-summary/) |
| audio/sfx/heartbeat.mp3 | [film-special-effects-thudding-heartbeat-372487](https://pixabay.com/sound-effects/film-special-effects-thudding-heartbeat-372487/) | [Pixabay](https://pixabay.com/service/license-summary/) |

## İşleme Notu

Ham dosyalar `assets-raw/` altında duruyor (git'e girmez). Yayına giden
sürümler şöyle hazırlandı:

- **Görseller:** jfif → webp; rol kartları 512×768, arka planlar 1080×1920,
  ikon 1024/512 png.
- **Müzik:** döngü parçaları 90 sn'ye, zafer temaları 25 sn'ye kırpıldı;
  giriş/çıkış fade eklendi (döngü dikişi duyulmasın), 128 kbps.
- **SFX:** hepsi aynı seviyeye getirildi (önce aradaki fark 20 dB'ydi;
  kurt uluması duyulmuyordu, horoz patlıyordu). Uluma 7.9 → 4 sn.
