# Nasıl Test Edilir

## 0. Geliştirme sunucusunu başlat

```bash
npm run dev
```

Terminal `Network:` satırında `http://192.168.x.x:5173` gibi bir adres
verir. Telefonlar aynı WiFi'daysa bu adresi kullanır.

## 1. Tek cihazda akış testi (ağ yok)

1. Ana ekranda isim yaz → **Tek cihazda dene**.
2. Lobide **Bot ekle** ile 4–11 bot ekle (en az 5 oyuncu gerekir).
3. **Oyunu Başlat** → rolünü gör → gece/gündüz/oylama akışını izle.

Botlar da tıpkı insanlar gibi yalnız kendi filtrelenmiş görünümlerini
kullanır; oyunu baştan sona tek başına oynayabilirsin.

## 2. İki cihaz / iki sekme (P2P)

1. Cihaz A: isim → **Oda Kur**. 6 haneli kod ve link çıkar.
2. Cihaz B: linke dokun (veya kodu yaz) → **Odaya Katıl**.
3. A'da oyuncu listesinde B görünmeli.

Aynı tarayıcıda iki sekme açarsan ikinci sekme otomatik olarak yeni bir
kimlik alır (aynı `playerToken` çakışması engellenir).

## 3. Gerçek oyun testi (5+ cihaz)

En az 5 oyuncu gerekir (6 kişiden itibaren Avcı da dağıtılır).
Kurucu bilgisayar/tablet olsun; telefonda kurucuysan ekranı kapatma.

Kontrol edilecekler:

- [ ] Herkes yalnız kendi rolünü görüyor.
- [ ] Vampirler birbirini görüyor, gece hedefinde ortaklaşıyor.
- [ ] Kâhin sonucu anında geliyor, kimse başkasının sonucunu görmüyor.
- [ ] Doktor aynı kişiyi üst üste iki gece seçemiyor.
- [ ] Ölen oyuncu hayalet moduna geçip tüm rolleri görüyor.
- [ ] Hiçbir ölünün rolü açıklanmıyor (ne gece ölümünde ne asılmada);
      roller yalnız oyun bitince herkesin ekranında açılıyor.
- [ ] Vampir istersem kendini/takım arkadaşını hedefleyebiliyor.
- [ ] Oylamada kendime oy verebiliyorum.
- [ ] Avcı öldüğünde son ok ekranı 30 sn içinde açılıyor.
- [ ] Oyun sonunda tüm roller ve zaman çizelgesi görünüyor.

## 4. Kopma testi (M2'nin asıl sınavı)

1. Oyun sürerken bir telefonu **uçak moduna** al.
2. Diğer cihazlarda o oyuncu "bağlantı yok" olarak işaretlenir.
3. 90 saniye dolmadan uçak modunu kapat → oyuncu aynı kimlikle döner,
   rolü ve durumu geri gelir.
4. 90 saniye geçerse "köyü terk etti" duyurusu düşer, oyun devam eder.

Ayrıca dene:

- Mobil veri ↔ WiFi karışık kombinasyonlar. (Mobil veri saha testinde
  çalışıyor; eskiden hiç bağlanmamasının sebebi operatörün BitTorrent
  tracker trafiğini kesmesiydi, `nostr` stratejisiyle çözüldü.)

## 4b. Bağlanamıyorsan: teşhis panelini oku

Bağlantı kurulamadığında "Odaya bağlanılıyor…" ekranındaki panel üç değeri
gösterir. Sorunu tahmin etmek yerine buradan oku:

| Panel | Anlamı | Ne yapmalı |
|---|---|---|
| Sinyal sunucusu **0/N** | Ağ, sinyalleşme trafiğini engelliyor | `.env` ile `VITE_P2P_STRATEGY=mqtt` veya `torrent` dene |
| Sinyal **>0**, Bulunan cihaz **0** | Sunucuya ulaşılıyor ama cihazlar birbirini bulamıyor — tipik CGNAT | TURN gerekiyor (bkz. aşağısı) |
| Bulunan cihaz **>0** ama lobi açılmıyor | Veri kanalı kurulamıyor | TURN gerekiyor |

**Bağlantı testini çalıştır** butonu cihazın kendi WebRTC yeteneğini ölçer:

- "Dış adres öğrenildi" → STUN çalışıyor.
- "TURN tanımlı değil" → mobil veride bağlantı kurulamayabilir; bu beklenen
  durumdur, TURN eklenene kadar WiFi kullanılmalı.

TURN eklemek için `.env.example` dosyasındaki `VITE_TURN_*` değişkenlerini
doldur. Ücretsiz ve hesapsız kamuya açık TURN sunucusu kalmadı; ya kendi
sunucunu (coturn) kurman ya da bir sağlayıcının ücretsiz katmanını
kullanman gerekir — bu, "sıfır maliyet" prensibini etkileyen bir karardır.
- Kurucunun sekmesini kapat → diğerlerinde "Anlatıcı kayboldu" ekranı.

## 5. Dil testi

Ayarlar (⚙️) → Dil → Türkçe/English. Aynı odadaki oyuncular farklı
dillerde oynayabilir; anlatım her cihazda kendi dilinde çözülür.

## 6. Otomatik testler

```bash
npm test              # 56 test: kurallar, görünüm filtresi, ağ, 100 rastgele oyun
npm run lint:strings  # hardcoded metin taraması
npm run check         # üçü birden + derleme
```
