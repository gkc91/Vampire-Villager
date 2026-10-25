# 08 — Elden Ele Modu (yerel oyuncular)

**Durum: TASARIM ONAYLANDI — kod bekliyor.**

Kaynak: 25 Ekim 2026 oyun gecesi.

> "Baştan oyuncu ekleyerek kurmak. Kurucu istediği kadar oyuncu
> ekleyebilsin, diğer oyuncuların yanına bot ekleme gibi düşün."

**Kapsam baştan kurma ile sınırlı.** İlk taslakta "düşen oyuncunun
koltuğunu devralma" da vardı; kullanıcı onu kapsam dışı bıraktı
("devralınmak değil, olay baştan oyuncu ekleyerek kurmak"). Bu belgede
yalnız elden ele modu var.

---

## Mimari: bu zaten mümkün

`buildPlayerView(state, roomId, viewerId)` kurucunun cihazında **herhangi
bir oyuncunun** filtrelenmiş görünümünü üretebiliyor. Botlar tam olarak
böyle oynuyor (`hostController.scheduleBots` → `buildPlayerView` →
`botAction` → `dispatch`).

Yerel oyuncu = aynı akış, kararı bot yerine **insan** veriyor.

Host-otoriter model değişmiyor, filtreleme değişmiyor, ağ katmanına
dokunulmuyor. Yeni olan tek şey arayüz.

---

## Gizlilik iki yerden sızar: EKRAN ve SES

`CLAUDE.md`: *"Her oyuncuya giden state filtrelenir; başka oyuncunun rolü
asla yetkisiz istemciye gönderilmez."*

### 1. Ekran → perde

Yerel oyuncunun görünümü kurucunun ekranında çiziliyor. Perde olmazsa
kurucu herkesin rolünü görür ve **oyun biter**.

```
┌─────────────────────────┐
│  Telefonu AYŞE'ye ver   │   ← kurucu okur, telefonu uzatır
│      [ Hazırım ]        │
└─────────────────────────┘
            ↓ Ayşe basar
┌─────────────────────────┐
│  Ayşe'nin kendi ekranı  │   ← normal oyuncu arayüzü
└─────────────────────────┘
            ↓ Ayşe bitirir
┌─────────────────────────┐
│  Bitti — telefonu ver   │
└─────────────────────────┘
```

Perde açılmadan yerel oyuncunun görünümü **hiç üretilmiyor**. Kurucunun
kendi ekranıyla yan yana asla çizilmiyor.

Perdede **yalnız isim** yazıyor. "Gece hamlen var" cümlesi bile o kişinin
gece uyanan bir rolü olduğunu masaya söyler.

### 2. Ses → ✅ ZATEN DÜZELTİLDİ

> "Kişinin rolü masaya belli olmamalı, onu sesli söyleme."

Bu yalnız elden ele modunun sorunu değildi — **bugün yayında olan bir
sızıntıydı**. Anlatıcı, görünümdeki her yeni kaydı okuyordu, `onlyFor`
ile kişiye özel olanları da: "Vampire dönüştürüldün", "rolün çalındı",
gece hamlesinin onayı. Ayarlardaki ipucu üstelik kullanıcıyı tam oraya
yönlendiriyor: *"Aynı odada oynuyorsanız kurucunun cihazında açın."*

Kural artık `src/ui/narrationVisibility.ts`'te: **herkese açık olan
okunur, kişiye özel olan yalnız ekranda kalır.** Kendiliğinden güvenli —
yeni gizli anlatıma `onlyFor` koymak yetiyor.

25 simüle edilmiş oyunun anlatımı üzerinde test var; kural kaldırılınca
**317 gizli kaydın** sesli okunacağı görülüyor.

---

## Veri modeli

`Player`a tek alan:

```ts
isLocal?: boolean;   // girdisi kurucunun cihazından geliyor
```

`isBot`tan ayrı:

| | `isBot` | `isLocal` |
|---|---|---|
| Kararı kim verir | `botAction` | insan |
| `scheduleBots` sürer mi | evet | **hayır** |
| Rol dağıtımına girer | evet | evet |
| Oyuncu sayısına sayılır | evet | **evet** |

`ADD_PLAYER` eylemi zaten var; yeni eylem türü gerekmiyor.

---

## Akış

**Lobi:** "Bot ekle"nin yanında *"Yerel oyuncu ekle"* + isim alanı.
Kurucu istediği kadar ekler.

**Hazır durumu:** yerel oyuncular **otomatik hazır**. Kurucu zaten onlar
adına ekliyor; tek tek hazırlamak gereksiz tık.

**Oyuncu sayısı:** 4–24 sınırına **sayılırlar**. Ayrım yapmaya sebep yok.

**Rol gösterme:** yerel oyuncular sırayla, her biri için perde.

**Gece / oy:** sırası gelen yerel oyuncu için perde → hamle → perde.

**Çıkarma:** lobide botlardaki gibi (`removeBot` deseni). **Oyun
ortasında yok** — kullanıcının kararı: *"yerel oyuncu çıkarsa oyun
patlıyor zaten, kapatılıyor oyun demek, ekstra bir şey yapma."* Rol
dağılımını bozacağı için özel bir kurtarma yolu yazılmıyor.

---

## Test planı

Kural değişikliği = test değişikliği (`CLAUDE.md`).

- **Motor:** yerel oyuncu rol dağıtımına ve sayı sınırlarına normal
  oyuncu gibi giriyor.
- **Gizlilik (en önemlisi):** aynı `id` için yerel oyuncunun görünümü,
  uzak oyuncunun görünümüyle **birebir aynı**. Tek bayt fazla bilgi
  sızarsa test düşer.
- **Perde:** "Hazırım"a basılmadan rol DOM'a hiç girmiyor.
- **Hazır durumu:** eklenen yerel oyuncu lobide hazır görünüyor.
- **Gerileme:** botlar etkilenmiyor; `scheduleBots` yerel oyuncuya
  dokunmuyor.

---

## Kapsam dışı

- Düşen oyuncunun koltuğunu devralma (kullanıcı kapsam dışı bıraktı)
- Oyun ortasında yerel oyuncu çıkarma
- Yerel oyuncular için ayrı renk/avatar seçimi
- Perdede geri sayım
- Yerel oyuncunun uzak cihaza devredilmesi

---

## Milestone

M8. `07-tasks.md`'ye görev maddeleri olarak girer; her commit bir madde
ile eşleşir.
