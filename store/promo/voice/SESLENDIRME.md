# Tanıtım videosu — ElevenLabs seslendirmesi

Video sesli de sessiz de çalışır: her cümle ekranda altyazı olarak
duruyor. Seslendirme dosyaları gelince betik onları okutur, sahne
sürelerini cümlenin uzunluğuna göre ayarlar ve konuşma sırasında müziği
kısar.

## Ne yapacaksın

1. `voice/en/SATIRLAR.txt` dosyasını aç. Her satır bir dosya:
   `01.mp3  Every village has a secret.` gibi.
2. ElevenLabs → **Text to Speech**. Her satırı **ayrı ayrı** üret.
   Hepsi **aynı sesle** olmalı.
3. İndirdiğin dosyaları `store/promo/voice/en/` içine `01.mp3`,
   `02.mp3` … diye koy. Eksik olan satır sessiz geçer, sorun çıkmaz.
4. Videoyu yeniden üret:
   ```
   python store/promo/make_promo.py en
   ```

Türkçe için aynısı: `voice/tr/SATIRLAR.txt` → `voice/tr/01.mp3` …
(`python store/promo/make_promo.py tr` bir kez çalıştırınca liste oluşur.)

## Ses seçimi

Voice Library'de şunlarla ara: **"deep storyteller"**, **"dark fantasy
narrator"**, **"horror narrator"**. Aradığımız: alçak, sakin, biraz
fısıltıya yakın, gerilim anlatan biri. Bağıran trailer sesi değil.

İngilizce ve Türkçe için aynı sesi kullanmak marka için iyi olur.
Multilingual modeller bunu destekliyor.

## Ayarlar

| Ayar | Değer |
|---|---|
| Model | **Eleven v3** (duygu etiketleri için), ya da Multilingual v2 |
| Stability | %40–50 |
| Similarity | %75 |
| Style | %30–40 |
| Speed | 0,9 (biraz yavaş, gerilimli) |
| Çıktı | MP3, 44.1 kHz |

Eleven v3 kullanırsan satırların başına duygu etiketi ekleyebilirsin.
Etiketleri yalnız ElevenLabs'e yazdığın metne koy, `SATIRLAR.txt`'yi
değiştirme:

- 01 `[whispers]` Every village has a secret.
- 02 `[ominous]` One of you drinks blood.
- 09 `[quietly]` By morning, someone is gone.
- 11 `[slowly]` Will the village survive?

## Lisans

ElevenLabs'in **ücretsiz planı ticari kullanıma izin vermiyor**, ayrıca
atıf istiyor. Reklam ya da tanıtım için **ücretli bir plan** (Starter ve
üstü) gerekiyor. Üretimi o hesapla yap.
