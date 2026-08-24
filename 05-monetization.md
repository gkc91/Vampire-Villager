# 05 — Para Kazanma (YER TUTUCU — MVP'de AKTİF DEĞİL)

Hobi fazında hiçbir satış/reklam yapılmaz. Ama mimari, ileride tek noktadan
açılabilecek şekilde kurulur. Amaç: oyun tutarsa kod değişikliği minimal olsun.

## Tek Kapı: entitlements.ts

```ts
// src/monetization/entitlements.ts
export type Entitlement = "premium_roles" | "big_room" | "no_ads";

export function hasEntitlement(e: Entitlement): boolean {
  return true; // MVP: her şey herkese açık. İleride gerçek kontrol buraya.
}
```

Kodun geri kalanı SADECE bu fonksiyonu çağırır:
- 12+ oyuncu odası açılırken → `hasEntitlement("big_room")`
- Premium bayraklı rol seçilirken → `hasEntitlement("premium_roles")`
- Reklam noktasında → `!hasEntitlement("no_ads")`

## Reklam Noktası (kullanıcı kararı)

Yer: GAME_END'de, kazanan taraf açıklanmadan ÖNCE. Merak tepedeyken izlenir,
oyun akışını bölmez.

```ts
// src/monetization/adGate.ts
export async function showPreResultAd(): Promise<void> {
  // MVP: 2 sn "sonuçlar hazırlanıyor" animasyonu, reklam yok.
  // İleride: Capacitor'da AdMob interstitial; web'de atlanır veya
  //          alternatif ağ değerlendirilir (web'de ödüllü video zayıf).
}
```

Not: Reklam yalnız native (AdMob) tarafında gerçekçi; web tarafında bu kapı
büyük ihtimalle hep boş geçecek. Bu bilinçli bir karar.

## İleride Açılırsa Gerekecekler (bilgi notu, şimdi YAPILMAYACAK)

- Ödeme doğrulama için minimal backend (Supabase ücretsiz katman yeterli
  olabilir) veya native tarafta App Store / Play Store satın alma + makbuz
  kontrolü.
- Bu, "geliştiriciye sıfır masraf" prensibiyle çelişebilir → o gün geldiğinde
  ayrıca karar verilecek. Şimdilik yalnız iskelet.

## Premium Aday Listesi (bayrak olarak kodda durur)

- 12+ kişilik oda (`big_room`)
- Faz-2 rollerinin bir kısmı (`premium_roles`) — hangileri olacağı, 14 rol
  bu plana işlendiğinde seçilecek
- Reklamsız deneyim (`no_ads`)
