# Masa Kartı (QR)

`masa-karti-a4.html` — A4'e 2x2 dizilmiş **dört A6 kart**. Tarayıcıda aç,
Ctrl+P, kes.

## Yazdırma ayarları

| Ayar | Değer |
|---|---|
| Kağıt | A4 |
| Ölçek | **%100** ("sayfaya sığdır" KAPALI) |
| Kenar boşluğu | Yok / Varsayılan |
| Arka plan grafikleri | **AÇIK** |

> "Arka plan grafikleri" kapalıysa kartın koyu zemini basılmaz, beyaz
> kağıt üzerinde havada duran yazılar çıkar. Chrome'da Diğer ayarlar →
> Arka plan grafikleri.
>
> Ölçeği %100'de tut: kart 95x138 mm, QR 46x46 mm. Küçültürsen modül
> boyu 1,12 mm'nin altına iner ve uzaktan okunmaz.

## Kartlar neden A6'dan küçük

A6 = 105x148 mm ama kart 95x138 mm. Yazıcıların basamadığı ~5 mm kenar
payı var; kartı hücreye tam oturtsaydım koyu zemin kırpılırdı. Kalan
beyaz boşluk aynı zamanda kesme payı.

## QR nereye gidiyor

`https://lampwickgames.com` — tek oyuna değil stüdyo sayfasına. İkinci
oyun çıktığında mekandaki kartı değiştirmen gerekmez.

## Yeniden üretmek

```bash
python scripts/make-qr-card.py
```

Adresi değiştirmek için script içindeki `URL` sabitini düzenle. QR pure
Python (`segno`) ile üretiliyor, dış servise resim çizdirilmiyor —
kartın üstündeki kod hiçbir üçüncü tarafa bağlı değil.

**Değişiklikten sonra kodu çöz ve doğrula.** SVG yolu elle üretiliyor;
satır/sütun karıştırılırsa geçerli görünen ama yanlış adrese giden bir
kod çıkar. Doğrulama: kodu görüntüye çevirip bağımsız bir çözücüyle
(OpenCV `QRCodeDetector`) okuyup adresi karşılaştır.
