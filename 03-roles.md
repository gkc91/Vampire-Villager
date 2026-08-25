# 03 — Roller

> **Durum:** Bu dosya kullanıcının 14'lük setinden gelen yeni kural setiyle
> güncellendi. Kodda şu an MVP'nin 5 rolü var (eski kurallarla); yeni set
> henüz uygulanmadı. Uygulamadan önce "Açık Sorular" bölümü kapatılmalı.
> Eski MVP kuralları için git geçmişine bakılabilir.

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
- Etkisi iki katmanlı:
  1. O gün **kimse asılmaz.**
  2. Seçtiği oyuncu **o gece uyanamaz ve özelliğini kullanamaz.**

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
- **Özel durum:** avcıyı dönüştürmeye çalışırsa dönüşüm olmaz; onun yerine
  **rastgele bir vampir düz köylü olur.**

### Kan Büyücüsü — Vampirler
- **Oyun boyunca 2 gece**, köy takımından bir oyuncuyu mühürler.
- Mühürlenen oyuncu o gece **uyanamaz ve özelliğini kullanamaz.**
- **Özel durum:** avcıyı mühürlemeye çalışırsa mühür işlemez ve **avcıya bir
  uyarı gösterilir.**

### Sisler Vampiri — Vampirler
- Kullandığı geceden itibaren **her 3 gecede bir** sis oluşturabilir.
- Sis, **bilgi alan rollerin tamamını** (kâhin, dedektif) birden uyanmaktan
  ve özelliklerini kullanmaktan alıkoyar.

### Hırsız — Tarafsız
- Gece **en son** uyanır; ondan önceki tüm etkiler uygulanmıştır.
- Seçtiği oyuncunun **rolünü çalar**; ertesi güne o rolle uyanır.
- Rolü çalınan oyuncu — vampir de olsa köylü de olsa — rolünü kaybeder ve
  **düz köylü** olarak devam eder.
- **Çalma bir kezdir.** Çaldığı andan itibaren hırsız o roldür ve o rolün
  takımındadır; kazanma koşulu da o takımın koşuludur. Çalmadan ölürse
  tarafsız olarak kaybeder.

## Açık Sorular (uygulamadan önce kapatılmalı)

Aşağıdakiler listede belirtilmediği için kural uydurulmadı.

**D1 — Doktor:** Eski kuraldaki "aynı kişiyi üst üste iki gece koruyamaz"
kısıtı kalktı mı? (Yeni metin "istediği kişiyi" diyor → kalktı varsayımı.)

**B1 — Büyücü:** Büyü yapılınca oylama hiç açılmıyor mu, yoksa oylama olup
sonucu mu geçersiz sayılıyor? Büyücü hedefini büyüyü yaparken mi seçiyor?

**VL1 — Vampir Lordu:** Dönüştürülen oyuncuya bildirilir mi? Diğer
vampirler onu görür mü? Dönüştürme yapılan gece vampirler ayrıca kurban da
öldürebilir mi?

**KB1 — Kan Büyücüsü:** Aynı kişiyi iki kez mühürleyebilir mi? Tarafsız
(hırsız) mühürlenebilir mi?

**S1 — Sisler Vampiri:** İlk sis 1. gecede kullanılabilir mi? "3 gecede
bir" = kullandıktan sonra 2 gece bekleyip 3. gecede tekrar mı? Sis doktoru
etkiler mi (bilgi rolü değil)?

## Dağılım Tablosu (TASLAK — onay bekliyor)

Vampir sayısı `floor((n-1)/3)` formülüyle (önceki onaylanan kural), özel
roller kademeli açılıyor. Vampirler her sayıda azınlıkta.

| Oyuncu | Vampir tarafı | Köy tarafı | Tarafsız |
|---|---|---|---|
| 5 | Vampir | Kâhin, Doktor, 2 Köylü | — |
| 6 | Vampir | Kâhin, Doktor, Avcı, 2 Köylü | — |
| 7 | Vampir, **Lord** | Kâhin, Doktor, Avcı, 2 Köylü | — |
| 8 | Vampir, Lord | Kâhin, Doktor, Avcı, **Dedektif**, 2 Köylü | — |
| 9 | Vampir, Lord | Kâhin, Doktor, Avcı, Dedektif, 2 Köylü | **Hırsız** |
| 10 | Vampir, Lord, **Kan Büyücüsü** | Kâhin, Doktor, Avcı, Dedektif, **Büyücü**, 1 Köylü | Hırsız |
| 11 | Vampir, Lord, Kan Büyücüsü | Kâhin, Doktor, Avcı, Dedektif, Büyücü, 2 Köylü | Hırsız |
| 12 | Vampir, Lord, Kan Büyücüsü | Kâhin, Doktor, Avcı, Dedektif, Büyücü, 3 Köylü | Hırsız |
| 13 | Vampir, Lord, Kan Büyücüsü, **Sisler** | Kâhin, Doktor, Avcı, Dedektif, Büyücü, 3 Köylü | Hırsız |
| 14 | Vampir, Lord, Kan Büyücüsü, Sisler | Kâhin, Doktor, Avcı, Dedektif, Büyücü, 4 Köylü | Hırsız |
| 15 | Vampir, Lord, Kan Büyücüsü, Sisler | Kâhin, Doktor, Avcı, Dedektif, Büyücü, 5 Köylü | Hırsız |
| 16 | 2 Vampir, Lord, Kan Büyücüsü, Sisler | Kâhin, Doktor, Avcı, Dedektif, Büyücü, 5 Köylü | Hırsız |

Açılış sırası mantığı:
- **Vampir tarafı:** önce düz Vampir → Lord (7) → Kan Büyücüsü (10) →
  Sisler (13) → ikinci düz Vampir (16).
- **Köy tarafı:** Kâhin + Doktor her zaman → Avcı (6) → Dedektif (8) →
  Büyücü (10).
- **Hırsız** 9 kişiden itibaren; küçük odada tek bir rol çalması oyunu
  fazla sarsıyor.

16 üstü için formül sürer: vampir `floor((n-1)/3)`, eklenen her oyuncu düz
köylü olur.

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
