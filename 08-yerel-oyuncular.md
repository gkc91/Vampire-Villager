# 08 — Yerel Oyuncular (devralma + elden ele)

**Durum: TASARIM — onay bekliyor. Kod yazılmadı.**

Kaynak: 25 Ekim 2026 oyun gecesi. İki istek aynı mekanizmaya çıkıyor:

1. **Devralma** — "birinin şarjı biterse kurucunun telefonunda kişi ekleme
   olsun". Altı kişi oynuyor, biri düşüyor, oyun yarıda kalıyor.
2. **Elden ele** — "en baştaki elden ele modu. Kurucu istediği kadar
   oyuncu ekleyebilsin, diğer oyuncuların yanına bot ekleme gibi düşün."

İkisi de şu tek cümleye indirgeniyor: **girdisi kurucunun cihazından gelen
bir koltuk.**

---

## Mimari: bu zaten mümkün

`buildPlayerView(state, roomId, viewerId)` kurucunun cihazında **herhangi
bir oyuncunun** filtrelenmiş görünümünü üretebiliyor. Botlar tam olarak
böyle oynuyor (`hostController.scheduleBots` → `buildPlayerView` →
`botAction` → `dispatch`).

Yerel oyuncu = aynı akış, kararı bot yerine **insan** veriyor.

Bunun anlamı: host-otoriter model değişmiyor, filtreleme değişmiyor, ağ
katmanına dokunulmuyor. Yeni olan tek şey arayüz.

---

## Gizlilik: perde süs değil, kuralın kendisi

`CLAUDE.md`: *"Her oyuncuya giden state filtrelenir; başka oyuncunun rolü
asla yetkisiz istemciye gönderilmez."*

Yerel oyuncunun görünümü kurucunun ekranında çiziliyor. Perde olmazsa
kurucu herkesin rolünü görür ve **oyun biter** — vampiri bilen bir köylü
masası oyun değildir.

Bu yüzden akış şöyle:

```
┌─────────────────────────┐
│  Telefonu AYŞE'ye ver   │   ← kurucu okur, telefonu uzatır
│      [ Hazırım ]        │
└─────────────────────────┘
            ↓ Ayşe basar
┌─────────────────────────┐
│  Ayşe'nin kendi ekranı  │   ← normal oyuncu arayüzü
│  (rol / gece / oy)      │
└─────────────────────────┘
            ↓ Ayşe işini bitirir
┌─────────────────────────┐
│  Bitti — telefonu geri  │
│         ver             │
└─────────────────────────┘
```

Perde açılmadan yerel oyuncunun görünümü **hiç üretilmiyor**. Kurucunun
kendi ekranıyla yan yana asla çizilmiyor.

Kurucunun fiziksel olarak dikizlemesi engellenemez — elden ele oynanan her
oyunda durum aynı. Yazılımın sorumluluğu kazara göstermemek; onu perde
sağlıyor.

---

## Veri modeli

`Player`a tek alan ekleniyor:

```ts
isLocal?: boolean;   // girdisi kurucunun cihazından geliyor
```

`isBot`tan **ayrı** tutuluyor çünkü davranışları farklı:

| | `isBot` | `isLocal` |
|---|---|---|
| Kararı kim verir | `botAction` | insan |
| `scheduleBots` sürer mi | evet | **hayır** |
| Rol dağıtımına girer | evet | evet |
| `connected` | hep true | hep true (cihaz kurucunun) |

`ADD_PLAYER` eylemi zaten var; yeni eylem türü gerekmiyor.

---

## A) Devralma — düşen oyuncunun koltuğu

**Tetik:** oyuncu koptu (`SUSPENSION_MS` 90 sn sayıyor) ya da `left`.

**Arayüz:** kurucunun oyuncu listesinde o satırda
*"Bu oyuncuyu telefonumda oynat"*.

**Etki:** `isLocal = true`, askı iptal, **rol korunur**. Tur kaldığı
yerden sürer; yeni rol dağıtılmaz.

Bu küçük iş: rol zaten dağıtılmış, yalnız girdinin geldiği yer değişiyor.

---

## B) Elden ele — baştan yerel oyuncu

**Arayüz:** lobide "Bot ekle"nin yanında *"Yerel oyuncu ekle"* + isim
alanı.

**Etki:** normal oyuncu olarak eklenir (`isPlayer: true, isLocal: true`).
Rol dağıtımı, kazanma koşulları, her şey aynı.

**Akış:**
- **Rol gösterme:** yerel oyuncular sırayla, her biri için perde.
- **Gece:** sırası gelen yerel oyuncu için perde → hamlesini yapar → perde.
- **Oy:** aynı.

Tek cihazla oynanan bir masa bu şekilde tamamen mümkün hale geliyor.

---

## Senin kararın olan noktalar

Bunlar kuralı değiştiriyor, tahminle ilerlemiyorum:

1. **Devralınan oyuncu geri bağlanırsa ne olsun?**
   (a) koltuğu geri alır, yerel mod kapanır —
   (b) yerel kalır, dönen cihaz izleyici olur —
   (c) kurucuya sorulur
   *Önerim (a): şarjı biten kişi şarja takıp geri dönebilir.*

2. **Elden ele oyuncular lobide otomatik "hazır" sayılsın mı?**
   *Önerim: evet — kurucu zaten onlar adına ekliyor, tek tek hazırlamak
   gereksiz tık.*

3. **Yerel oyuncu oyun ortasında çıkarılabilsin mi?**
   *Önerim: evet, botlardaki `removeBot` gibi — ama yalnız LOBİDE.
   Oyun başladıktan sonra çıkarmak rol dağılımını bozar.*

4. **Oyuncu sayısı sınırları (4–24) yerel oyuncuları da sayıyor mu?**
   *Önerim: evet, ayrım yapmaya sebep yok.*

5. **Perdede ne yazsın?** Yalnız isim mi ("Telefonu Ayşe'ye ver"), yoksa
   ne yapacağı da mı ("sıra sende, gece hamlen var")?
   *Önerim: yalnız isim. "Gece hamlen var" cümlesi bile masaya o kişinin
   gece uyanan bir rolü olduğunu söyler — sızıntı.*

---

## Test planı

Kural değişikliği = test değişikliği (`CLAUDE.md`).

- **Motor:** yerel oyuncu rol dağıtımına normal oyuncu gibi giriyor.
- **Gizlilik (en önemlisi):** aynı `id` için yerel oyuncunun görünümü,
  uzak oyuncunun görünümüyle **birebir aynı**. Tek bayt fazla bilgi
  sızarsa test düşer.
- **Perde:** "Hazırım"a basılmadan rol DOM'a hiç girmiyor.
- **Devralma:** askı iptal oluyor, rol korunuyor, tur ilerliyor.
- **Gerileme:** botlar etkilenmiyor; `scheduleBots` yerel oyuncuya
  dokunmuyor.

---

## Kapsam dışı (şimdilik)

- Yerel oyuncular için ayrı renk/avatar seçimi
- Perdede geri sayım
- Yerel oyuncunun uzak cihaza "devredilmesi" (B'nin tersi)

---

## Milestone

M8. Onaydan sonra `07-tasks.md`'ye görev maddeleri olarak girer; her
commit bir madde ile eşleşir.
