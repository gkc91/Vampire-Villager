# 03 — Roller

> **Durum:** Kural seti tamamlandı, açık soru kalmadı. Kodda şu an MVP'nin
> 5 rolü var (eski kurallarla); bu set henüz uygulanmadı — bkz. 07-tasks.md
> M7. Eski MVP kuralları için git geçmişine bakılabilir.

## Rol Listesi (11 rol)

| Rol | Taraf | Ne yapar | Ne sıklıkta |
|---|---|---|---|
| Köylü | Köy | Yeteneksiz | — |
| Doktor | Köy | Gece bir kişiyi korur | **Oyun boyunca 2 kez** |
| Kâhin | Köy | Bir kişinin vampir olup olmadığını öğrenir | Her gece |
| Dedektif | Köy | Bir kişinin o gece uyanıp uyanmadığını öğrenir | Her gece |
| Büyücü | Köy | Gündüz büyü yapar | **Oyun boyunca 1 kez** |
| Avcı | Köy | Pasif: vampir saldırısı geri teper | Süresiz |
| Vampir | Vampirler | Gece ortak kurban oylaması | Her gece |
| Vampir Lordu | Vampirler | Bir oyuncuyu vampire dönüştürür | **Oyun boyunca 1 kez** |
| Kan Büyücüsü | Vampirler | Köy tarafından birini mühürler | **Oyun boyunca 2 kez** |
| Sisler Vampiri | Vampirler | Sis: bilgi rollerini engeller | **3 gecede bir** |
| Hırsız | Tarafsız | Seçtiği kişinin rolünü çalar | **Bir kez** (sonra o rol olur) |

## Gece Sırası ve Çözümleme Modeli

**Kritik:** Aksiyonlar toplanıp sonda çözülmez; **seçim anında uygulanır.**
Sıra şudur:

1. **Vampir Lordu** — dönüştürme (varsa)
2. **Kan Büyücüsü** — mühürleme (varsa)
3. **Sisler Vampiri** — sis (varsa)
4. **Vampir oylaması** — ortak kurban
5. **Doktor** — koruma
6. **Kâhin** — sorgu
7. **Dedektif** — sorgu
8. **Hırsız** — rol çalma (her zaman en son)

Anında uygulama örnekleri:
- Vampir Lordu ısırırsa dönüşüm o an olur; sonraki adımlar yeni duruma göre
  işler.
- Doktor, vampirlerin kurban seçtiği kişiyi korursa **oylama geçersiz kalır,
  o gece kimse ölmez.**
- Hırsız en son uyandığı için ondan önceki tüm etkiler uygulanmış olur.

## Rol Kuralları

### Köylü — Köy
Yeteneği yok. Tek silahı gündüz konuşması ve oyu.

### Doktor — Köy
- Gece bir oyuncuyu korur. Korunan kişi o gece vampir saldırısından ölmez.
- **Oyun boyunca yalnız 2 kez** kullanılabilir.
- Koruma **yalnız gece işler**; gündüz asılmasını engellemez.
- Kendini koruyabilir.
- **Aynı kişiyi üst üste iki gece koruyamaz.**

### Kâhin — Köy
- Her gece bir oyuncu seçer; oyun o kişinin **vampir olup olmadığını** söyler.

### Dedektif — Köy
- Her gece bir oyuncu seçer; oyun o kişinin **o gece uyanıp uyanmadığını**
  söyler.
- Rol ve takım bilgisi vermez.
- Uyananlar arasında hem köy tarafı (doktor, kâhin…) hem vampirler olabilir.
- **"Uyandı" = o gece fiilen seçim yapmış olmak.** Vampir oylamasına katılan
  vampirler uyanmış sayılır. Mühürlenen, sisle engellenen, hakkı bitmiş
  (ör. 2 korumasını kullanmış doktor) ve pas geçen oyuncu **uyanmadı**
  görünür. Engelleme mekanikleri böylece dedektifin gözünde iz bırakır.

### Büyücü — Köy
- **Oyun boyunca 1 kez** büyü yapar.
- Büyü **gündüz, konuşma sırasında, asılmadan önce** yapılır.
- Hedefini **büyüyü yaparken seçer.**
- Etkisi:
  1. Herkese **"büyü yapıldı"** bildirimi gider (kimin yaptığı gizli).
  2. **O gün oylama hiç açılmaz.** Tartışma süresine **1 dakika eklenir**;
     süre bitince doğrudan geceye geçilir.
  3. Seçtiği oyuncu **o gece uyanamaz ve özelliğini kullanamaz.**

### Avcı — Köy
- Pasiftir, gece aksiyonu yoktur.
- Vampirler avcıyı öldürmeye çalışırsa saldırı geri teper: **rastgele bir
  vampir düz köylüye dönüşür** ve o gece kimse ölmez.
- Bu **her seferinde tekrar eder**; sınırsızdır. Dönüştürülecek vampir
  kalmamışsa saldırı boşa gider, avcı yine ölmez.
- Bu dönüşüm **gizlidir**; oyun içinde kimseye gösterilmez. Dönüşen oyuncu
  isterse sözlü olarak anlatır, oyun açıklamaz.
- Vampir kalmazsa köylüler kazanır.
- Avcı **gündüz asılabilir** (bu koruma yalnız gece saldırısına karşıdır).

### Vampir — Vampirler
- Her gece diğer vampirlerle ortak kurban seçer.
- Vampirler birbirini bilir.

### Vampir Lordu — Vampirler
- **Oyun boyunca 1 kez** gece bir oyuncuyu vampire dönüştürür.
- Bunun dışında normal vampir oylamasına katılır, diğer özellikleri aynıdır.
- Dönüştürülen oyuncuya **bildirilir**; o andan itibaren diğer vampirleri
  görür, vampirler de onu görür.
- Dönüştürüldüğü gece **kurban seçimine katılamaz**; sonraki gecelerden
  itibaren normal vampir gibi oynar.
- **Özel durum:** avcıyı dönüştürmeye çalışırsa dönüşüm olmaz; onun yerine
  **rastgele bir vampir düz köylü olur.**

### Kan Büyücüsü — Vampirler
- **Oyun boyunca 2 gece**, vampir olmayan bir oyuncuyu mühürler
  (köy tarafı ya da tarafsız hırsız).
- Mühürlenen oyuncu o gece **uyanamaz ve özelliğini kullanamaz.**
- **Aynı kişiyi iki kez mühürleyebilir.**
- **Özel durum:** avcıyı mühürlemeye çalışırsa mühür işlemez ve **avcıya bir
  uyarı gösterilir.** Hak yine de harcanır.
- **Kan büyücüsü mührün tuttuğunu ÖĞRENMEZ.** Yalnız kimi seçtiğini görür.
  Bu bilinçli bir karardır (kullanıcı onayı, 2026-08-25): "mühür tutmadı"
  bildirimi doğrudan "bu oyuncu avcı" demek olurdu ve vampir takımına
  bedava kâhin bilgisi verirdi. Eksik geri bildirim sanılıp eklenmemeli.

### Sisler Vampiri — Vampirler
- İlk sisi **istediği gece** kullanır (1. gece dahil).
- Kullandıktan sonra **2 gece bekler**; tekrar kullanabileceği en erken gece
  **kullandığı geceden sonraki 3. gecedir.**
- Sis, **bilgi alan rollerin tamamını** (kâhin, dedektif) birden uyanmaktan
  ve özelliklerini kullanmaktan alıkoyar. Doktor gibi bilgi rolü olmayanlar
  etkilenmez.

### Hırsız — Tarafsız
- Gece **en son** uyanır; ondan önceki tüm etkiler uygulanmıştır.
- Seçtiği oyuncunun **rolünü çalar**; ertesi güne o rolle uyanır.
- Rolü çalınan oyuncu — vampir de olsa köylü de olsa — rolünü kaybeder ve
  **düz köylü** olarak devam eder.
- **Çalma bir kezdir.** Çaldığı andan itibaren hırsız o roldür ve o rolün
  takımındadır; kazanma koşulu da o takımın koşuludur. Çalmadan ölürse
  tarafsız olarak kaybeder.
- Çalınan rol **tam hakla** devralınır. Kurban hakkını tüketmiş olsa bile
  hırsız sıfırdan başlar; aksi hâlde hakkı bitmiş bir rolü çalmanın anlamı
  kalmazdı (ör. tek dönüştürmesini kullanmış Vampir Lordu).

## Rol Seçimi: Öneri + Kurucu İnisiyatifi

**Dağılım dayatılmaz.** Oyun kurucusuna oyuncu sayısına göre bir **öneri**
sunulur; kurucu istediği rolü ekler, çıkarır. Karar tamamen oyunculara ait.

- **Minimum 4 oyuncu.** Üst sınır yok.
- Oyuncu sayısı lobide **kaydırmalı bir denetimle** (slider) belirlenir.
- Öneri, sayı değiştikçe kendiliğinden güncellenir; kurucu elle değişiklik
  yaptıysa onun seçimi korunur.
- Tek zorunlu kural: **en az 1 vampir ve en az 1 vampir olmayan** oyuncu.
  Bunun dışında dengeyi kurucu üstlenir (2 vampire karşı 2 köylü isterse
  oyun buna izin verir, uyarı gösterir).

### Önerilen Dağılım

Vampir sayısı `floor((n-1)/3)`; özel roller kademeli açılır.

| Oyuncu | Vampir tarafı | Köy tarafı | Tarafsız |
|---|---|---|---|
| 4 | Vampir | Kâhin, Doktor, 1 Köylü | — |
| 5 | Vampir | Kâhin, Doktor, 2 Köylü | — |
| 6 | Vampir | Kâhin, Doktor, Avcı, 2 Köylü | — |
| 7 | Vampir, **Lord** | Kâhin, Doktor, Avcı, 2 Köylü | — |
| 8 | Vampir, Lord | Kâhin, Doktor, Avcı, **Dedektif**, 2 Köylü | — |
| 9 | Vampir, Lord | Kâhin, Doktor, Avcı, Dedektif, 2 Köylü | **Hırsız** |
| 10 | Vampir, Lord, **Kan Büyücüsü** | Kâhin, Doktor, Avcı, Dedektif, **Büyücü**, 1 Köylü | Hırsız |
| 11 | Vampir, Lord, Kan Büyücüsü | + 1 Köylü | Hırsız |
| 12 | Vampir, Lord, Kan Büyücüsü | + 2 Köylü | Hırsız |
| 13 | + **Sisler** | + 2 Köylü | Hırsız |
| 14-15 | Vampir, Lord, Kan Büyücüsü, Sisler | + Köylü | Hırsız |
| 16+ | + düz Vampir (formüle göre) | + Köylü | Hırsız |

Açılış sırası: vampir tarafında düz Vampir → Lord (7) → Kan Büyücüsü (10)
→ Sisler (13); köy tarafında Kâhin + Doktor → Avcı (6) → Dedektif (8) →
Büyücü (10); Hırsız 9'dan itibaren.

## Rol Tanım Şablonu (kod sözleşmesi)

Her rol `src/game/roles/` altında bu arayüzü uygular; yeni rol eklemek
= yeni dosya + i18n anahtarları + asset. Çekirdek koda dokunulmaz.

```ts
interface RoleDefinition {
  id: string;                    // "vampire", "seer"...
  team: "village" | "vampire" | "neutral";
  nightAction?: {
    phase: number;               // çözümleme sırası (yukarıdaki gece sırası)
    targetType: "player" | "none";
    validTargets: (state, actorId) => PlayerId[];
    resolve: (state, actorId, targetId) => StateEffect[];
  };
  onDeath?: (state, playerId) => StateEffect[];
  knowsTeammates?: boolean;      // vampirler için true
  premium?: boolean;             // yer tutucu bayrağı
}
```

> Not: yeni set "seçim anında uygulama" ve "sınırlı kullanım hakkı"
> gerektiriyor. Bu, motorda gece fazının sıralı adımlara bölünmesini ve
> rol başına kullanım sayacı tutulmasını gerektirir (bkz. 07-tasks.md).
