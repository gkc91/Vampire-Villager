# 03 — Roller

## MVP Rolleri (5)

| Rol | Taraf | Yetenek | Not |
|---|---|---|---|
| Vampir | Vampirler | Her gece ortak bir kurban seçer | Vampirler birbirini bilir. Hedefte kısıt YOK: kendini de takım arkadaşını da seçebilir (blöf taktiği) |
| Köylü | Köy | Yeteneksiz | Gündüz oyu tek silahı |
| Kâhin | Köy | Her gece 1 kişinin vampir olup olmadığını öğrenir | En güçlü köy rolü |
| Doktor | Köy | Her gece 1 kişiyi korur | Aynı kişiyi üst üste 2 gece koruyamaz |
| Avcı | Köy | Ölünce (gece/asılma fark etmez) 1 kişiyi yanında götürür | 30 sn seçim süresi |

## Oyuncu Sayısına Göre Dağılım

| Oyuncu | Vampir | Kâhin | Doktor | Avcı | Köylü |
|---|---|---|---|---|---|
| 5 | 1 | 1 | 1 | 0 | 2 |
| 6 | 1 | 1 | 1 | 1 | 2 |
| 7 | 2 | 1 | 1 | 1 | 2 |
| 8 | 2 | 1 | 1 | 1 | 3 |
| 9 | 2 | 1 | 1 | 1 | 4 |
| 10 | 3 | 1 | 1 | 1 | 4 |
| 11 | 3 | 1 | 1 | 1 | 5 |
| 12 | 3 | 1 | 1 | 1 | 6 |

### 12 Üstü (üst sınır yok)

Tablonun kendi örüntüsü sürer:

- **Vampir sayısı = `floor((n-1)/3)`** — bu formül yukarıdaki 5–12 tablosunu
  birebir üretir (13-15 → 4, 16-18 → 5, 19-21 → 6 vampir).
- Kâhin, Doktor, Avcı **birer** tanedir.
- Kalan herkes düz **Köylü** olur.

Kod: `src/game/distribution.ts`. Test: "vampir formülü 5–12 tablosunu birebir
üretiyor" + "vampirler her zaman azınlıkta başlar".

`hasEntitlement('big_room')` kapısı 12 üstü oda ayarında durmaya devam eder
(05-monetization.md); MVP'de her zaman açık.

## Rol Tanım Şablonu (kod sözleşmesi)

Her rol `src/game/roles/` altında bu arayüzü uygular; yeni rol eklemek
= yeni dosya + i18n anahtarları + asset. Çekirdek koda dokunulmaz.

```ts
interface RoleDefinition {
  id: string;                    // "vampire", "seer"...
  team: "village" | "vampire" | "neutral";
  nightAction?: {
    phase: number;               // çözümleme sırası (vampir=10, kâhin=20, doktor=30)
    targetType: "player" | "none";
    validTargets: (state, actorId) => PlayerId[];
    resolve: (state, actorId, targetId) => StateEffect[];
  };
  onDeath?: (state, playerId) => StateEffect[];   // Avcı'nın son oku gibi
  knowsTeammates?: boolean;      // vampirler için true
  premium?: boolean;             // yer tutucu bayrağı, MVP'de hepsi false
}
```

## Faz-2 Rol Fikirleri (masaüstündeki 14'lük setten aktarılacak)

Kullanıcı masaüstü oyundaki 4 vampir + 10 köylü tipini buraya dökecek.
Şablon hazır olduğu için her biri bağımsız eklenebilir. Bilinen klasikler
referans olsun diye: Cadı (1 diriltme + 1 zehir), Küçük Kız (gece gizlice
gözetler), Yaşlı (ilk saldırıda ölmez), Aşıklar/Cupid, Muhtar (oyu çift
sayılır), Vampir Lideri (kâhine köylü görünür).

> NOT: Kullanıcının kendi 14 rolü bir sonraki planlama oturumunda bu dosyaya
> işlenecek. Claude Code bu dosyada olmayan rolü uydurmasın.
