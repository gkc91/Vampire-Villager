# Asset Kaynakları

06-assets.md'deki listeye göre üretilen/indirilen dosyaların kaynakları.
Yayınlamadan önce buranın dolu olduğundan emin ol.

## Görseller (Banana / Gemini)

| Dosya | Üretim tarihi | Not |
|---|---|---|
| roles/vampire.webp | | |
| roles/villager.webp | | |
| roles/seer.webp | | |
| roles/doctor.webp | | |
| roles/hunter.webp | | |
| bg/night.webp | | |
| bg/day.webp | | |
| bg/lobby.webp | | |
| bg/death.webp | | |
| icon/app-icon.png | | |
| icon/favicon.png | | |

## Müzik (Suno)

| Dosya | Üretim tarihi | Not |
|---|---|---|
| audio/music/lobby.mp3 | | |
| audio/music/night.mp3 | | |
| audio/music/day.mp3 | | |
| audio/music/win_village.mp3 | | |
| audio/music/win_vampires.mp3 | | |

## İşleme Notu

Ham dosyalar `assets-raw/` altında duruyor (git'e girmez). Yayına giden
sürümler şöyle hazırlandı:

- **Görseller:** jfif → webp; rol kartları 512×768, arka planlar 1080×1920,
  ikon 1024/512 png.
- **Müzik:** döngü parçaları 90 sn'ye, zafer temaları 25 sn'ye kırpıldı;
  giriş/çıkış fade eklendi (döngü dikişi duyulmasın), 128 kbps.
- **SFX:** hepsi aynı seviyeye getirildi (önce aradaki fark 20 dB'ydi;
  kurt uluması duyulmuyordu, horoz patlıyordu). Uluma 7.9 → 4 sn.

## SFX (CC0 / royalty-free — kaynak linki ZORUNLU)

| Dosya | Kaynak linki | Lisans |
|---|---|---|
| audio/sfx/wolf_howl.mp3 | https://pixabay.com/sound-effects/nature-rooster-crowing-364473/ | https://pixabay.com/service/license-summary/ |
| audio/sfx/rooster.mp3 | https://pixabay.com/sound-effects/nature-rooster-crowing-364473/ | https://pixabay.com/service/license-summary/ |
| audio/sfx/bell.mp3 | https://pixabay.com/sound-effects/musical-single-church-bell-156463/ | https://pixabay.com/service/license-summary/ |
| audio/sfx/death.mp3 | https://pixabay.com/sound-effects/horror-horror-impact-hit-567238/ |https://pixabay.com/service/license-summary/  |
| audio/sfx/click.mp3 | https://pixabay.com/sound-effects/film-special-effects-soft-pop-538611/ | |
| audio/sfx/heartbeat.mp3 | https://pixabay.com/sound-effects/film-special-effects-thudding-heartbeat-372487/ | https://pixabay.com/service/license-summary/ |
