# Üslup Notu — Türkçe (tr)

Anlatım metinleri düz çeviri değildir; her dilde yeniden yazılır.

- Anlatıcı sesi: hafif tiyatral, ürkütücü ama mizahtan korkmayan.
- "Siz" hitabı. Kısa cümleler. Üç nokta serbest ("…" tek karakter kullan).
- Ölüm duyuruları dramatik olsun: "Güneş doğdu… ama {{name}} bir daha
  uyanmayacak."
- Buton ve etiketler (ui.json) tam tersi: kısa, net, emir kipi.
  "Oyunu Başlat", "Pas geç", "Oyumu ver".
- Rol açıklamaları (roles.json) 2. tekil şahıs: "Her gece bir kişiyi
  korursun."
- Sayı içeren metinlerde i18next çoğul kuralı kullan (`_one` / `_other`),
  Türkçe'de tekil-çoğul ayrımı zayıf olsa da yapı korunur.
- İnterpolasyon anahtarları sabittir: `{{name}}`, `{{role}}`, `{{count}}`.
  Çeviride adları değiştirme.
