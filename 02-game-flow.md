# 02 — Oyun Akışı ve Durum Makinesi

Moderatör = deterministik durum makinesi (LLM YOK). AI/TTS yalnızca anlatım
katmanında süs olarak kullanılabilir; kurallar asla LLM'e bırakılmaz.

## Durumlar

```
LOBBY → ROLE_REVEAL → NIGHT → NIGHT_RESULT → DAY_DISCUSSION → VOTE
   → VOTE_RESULT → (kazanan yoksa NIGHT'a döner) → GAME_END
```

### LOBBY
- Host oda kurar → 6 haneli kod + paylaşılabilir link üretilir.
- Oyuncular isim girer (+ opsiyonel avatar seçimi).
- Host ayarları: oyuncu sayısı sınırı, rol seti (MVP: otomatik dağılım),
  tartışma süresi (varsayılan 3 dk), host oyuncu mu anlatıcı mı.
- Minimum 5 oyuncu (host anlatıcıysa 5 oyuncu + host).
- Herkes "hazır" olunca host "Başlat"a basar.

### ROLE_REVEAL
- Host rolleri dağıtır (bkz. 03-roles.md dağılım tablosu).
- Her oyuncu yalnız kendi rolünü görür; "gördüm, gizle" butonu.
- Vampirler birbirini görür (listede vampir arkadaşlarının isimleri).

### NIGHT
- Sıralı gece aksiyonları (hepsi paralel toplanır, sıra çözümlemede uygulanır):
  1. Vampirler ortak hedef seçer (çoğunluk; eşitlikte rastgele biri).
  2. Kâhin bir kişi seçer → "vampir mi değil mi" cevabı alır.
  3. Doktor bir kişiyi korur (üst üste iki gece aynı kişiyi koruyamaz;
     kendini koruyabilir).
- Aksiyonu olmayanlar bekleme ekranı görür ("Köy uyuyor…").
- Süre sınırı: 60 sn; süre dolarsa aksiyon "pas" sayılır
  (vampirlerde: o gece kimse ölmez).

### NIGHT_RESULT çözümleme sırası
1. Vampir hedefi belirlenir.
2. Doktor koruması uygulanır → hedef korunuyorsa ölüm iptal.
3. Ölüm varsa Avcı kontrolü: ölen Avcı ise "son ok" hakkı tetiklenir
   (30 sn içinde bir kişi seçer, o da ölür; seçmezse hak yanar).
4. Kazanma kontrolü → yoksa gündüze geç.
- Herkese anlatım metni: "Köy uyanıyor… [X] kanlar içinde bulundu" /
  "Bu gece kimse ölmedi."
- **Ölenin rolü açıklanmaz** (ne gece ölümünde ne asılmada).

### DAY_DISCUSSION
- Serbest tartışma (yüz yüze veya Discord sesli). Uygulama sadece sayaç ve
  hayatta kalanların listesini gösterir.
- Host isterse süreyi erken bitirebilir.

### VOTE
- Süre 45 sn.
- Herkes bir kişiye oy verir veya çekimser kalır. Kendine oy vermek serbesttir
  (taktik blöf).
- Çoğunluk kuralı: en çok oyu alan asılır. Eşitlik → kimse asılmaz
  (MVP kuralı; runoff sonraki faz).
- **Asılan kişinin rolü AÇIKLANMAZ.** Asılan Avcı ise "son ok" tetiklenir.

### GAME_END kazanma koşulları
- Köylüler kazanır: tüm vampirler ölünce.
- Vampirler kazanır: vampir sayısı ≥ hayattaki köylü sayısı olunca.
- Roller yalnız BURADA açılır: oyun bitince herkesin ekranında tüm roller
  gösterilir. (Ölü oyuncular ayrıca hayalet modunda görür.)
- Sonuç ekranından ÖNCE reklam yer tutucu noktası vardır (bkz. 05) —
  MVP'de 2 sn'lik "sonuçlar hazırlanıyor" geçişi olarak boş çalışır.
- Sonuç: kazanan taraf, tüm rollerin dökümü, oyun özeti (kim kimi öldürdü
  zaman çizelgesi).

## Ölü Oyuncular
- Ölüler oyunu izleyebilir: TÜM rolleri görür (hayalet modu), gece
  aksiyonlarını izler ama etkileşemez ve konuşmamaları beklenir (sosyal kural,
  ekranda hatırlatılır).

## Kopma Senaryoları
- Gece aksiyonu sırasında kopan oyuncu: süre sonunda "pas" sayılır.
- Oylamada kopan: çekimser sayılır.
- 90 sn dönmeyen oyuncu oyundan çıkarılır; rolü ölüm gibi işlenmez,
  "köyü terk etti" olarak duyurulur ve kazanma koşulları yeniden kontrol edilir.

## Anlatım Katmanı
- Her state geçişinin bir anlatım anahtarı vardır (`narration.night_death`,
  `narration.no_death`…) → i18n dosyasından çekilir, {isim} interpolasyonu.
- Opsiyonel TTS: host cihazında Web Speech API ile seslendirme (aynı odada
  oynanıyorsa host telefonu/bilgisayarı hoparlör olur). Ayarlardan aç/kapa.
