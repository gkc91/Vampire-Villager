# Mağaza Görselleri

Play Console → Mağaza girişi bölümüne yüklenecek dosyalar.

| Dosya | Boyut | Nerede kullanılıyor |
|---|---|---|
| `feature-graphic.png` | 1024×500 | Öne çıkan görsel (zorunlu) |
| `app-icon-512.png` | 512×512 | Uygulama ikonu (zorunlu) |
| `screens/` | 1080×2400 civarı | Telefon ekran görüntüleri (en az 2, pratikte 4-6) |

## Öne çıkan görsel nasıl üretildi

ffmpeg ile, oyunun kendi sanatından. Yeniden üretmek gerekirse
`scripts/make-feature-graphic.sh` çalıştırılır.

## Ekran görüntüleri — GERÇEK TELEFONDAN

Tarayıcıdan alınan görüntüler 375×812'de kalıyor; mağaza kabul eder ama
listede yumuşak görünür. **Gerçek telefonda çekilenler çok daha iyi.**

Çekim listesi (sırası mağazada da bu olsun — ilk iki görsel en çok
görülendir):

1. **Rol kartı** — Vampir Lordu ya da Kâhin. En etkileyici kare bu, ilk
   sıraya koy.
2. **Lobi** — büyük oda kodu ve dolu oyuncu listesi. "Arkadaşlar katılıyor"
   hissini veren kare.
3. **Gece ekranı** — "Kimi vampire dönüştürüyorsun?" sorusu ve oyuncu
   ızgarası.
4. **Gündüz / oylama** — tartışma ya da "Kim asılsın?" ekranı.
5. **Oyun sonu** — kazanan ve herkesin rolünün açıldığı ekran.

### Çekerken dikkat

- **`?test=1` ile açma.** Test bayrağı açıkken gece ekranında "GECE
  RÖNTGENİ" paneli çıkıyor; mağaza görüntüsünde bunun görünmesi hem
  amatörce durur hem kafa karıştırır.
- Bildirim çubuğunu temizle (saat, pil, bildirim simgeleri).
- Gerçek isimler yerine kısa, temiz takma adlar kullan.
- Dikey (portre) çek; oyun zaten dikey.
