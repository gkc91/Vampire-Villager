# Native Kabuk (Capacitor) — M6

Web tarafı bittiğinde aynı kod tabanı Capacitor kabuğunda çalışır.
Platform klasörleri (`android/`, `ios/`) repoda tutulmaz, `.gitignore`'dadır;
her makinede yeniden üretilir.

## Android (öncelik)

**Android Studio gerekmiyor.** Komut satırı araçları yetiyor; bu makinede
kurulu olan da bu.

| Gereksinim | Sürüm | Yer |
|---|---|---|
| JDK | **21** (17 YETMEZ) | `C:/Users/user/Java/jdk-21.0.12.1+1` |
| Android SDK | platform 36 + build-tools 36 | `C:/Users/user/Android/sdk` |
| Capacitor | 8 (targetSdk 36) | `android/variables.gradle` |

> **JDK 21 neden şart:** Capacitor 8 belgeleri "Java 17+ desteklenir, 21
> önerilir" diyor, ama `capacitor-android` modülü *source release 21* ile
> derleniyor. JDK 17 ile derleme `error: invalid source release: 21`
> vererek düşüyor. Sahada yaşandı.

```bash
npm run build
npx cap sync android
cd android
JAVA_HOME=C:/Users/user/Java/jdk-21.0.12.1+1 \
ANDROID_HOME=C:/Users/user/Android/sdk \
  ./gradlew assembleDebug     # elden test için APK
#  ./gradlew bundleRelease    # mağazaya giden .aab
```

Sonraki derlemelerde `npm run build && npx cap sync android` yeterlidir.

### `android/local.properties` — Windows tuzağı

Bu dosya bir **Java properties** dosyasıdır: ters bölü kaçış karakteridir
ve Windows yolundaki `\U` geçersiz kaçış dizisi sayılır. Gradle şöyle
düşer:

```
Could not create an instance of type ...SdkComponentsBuildService.
> Malformed \uxxxx encoding.
```

Çözüm — **eğik çizgi kullan:**

```properties
sdk.dir=C:/Users/user/Android/sdk
```

## iOS

macOS + Xcode gerekir (Windows'ta yapılamaz).

```bash
npm run build
npx cap add ios
npx cap sync
npx cap open ios
```

## Derin Link (link → uygulama → odaya düş)

Uygulama içi yönlendirme hash tabanlıdır: `https://ALAN-ADI/#/join/ODA123`.
Bu yüzden web'de ekstra sunucu ayarı gerekmez. Native tarafta iki yol açılır:

1. **Özel şema** `vampirkoylu://join/ODA123`
2. **App Link** `https://ALAN-ADI/join/ODA123`

`src/util/deepLink.ts` her iki biçimi de yakalar ve hash'e çevirir.

### Android: `android/app/src/main/AndroidManifest.xml`

`MainActivity` içindeki `<activity>` etiketine ekle:

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="vampirkoylu" android:host="join" />
</intent-filter>

<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="ALAN-ADI" android:pathPrefix="/join" />
</intent-filter>
```

App Link doğrulaması için sitenin köküne
`/.well-known/assetlinks.json` konur (Play Console imza parmak iziyle).

### iOS

Xcode → Signing & Capabilities → Associated Domains → `applinks:ALAN-ADI`
ve `Info.plist` içine `CFBundleURLSchemes` = `vampirkoylu`.
Siteye `/.well-known/apple-app-site-association` konur.

## WebRTC İzinleri

Oyun mikrofon/kamera kullanmaz; yalnız veri kanalı açar. Bu yüzden
ek izin gerekmez. Android 9+ cleartext kapalıdır (`allowMixedContent: false`).

## Mağaza Hazırlığı (kontrol listesi)

- [ ] Uygulama ikonu: `public/assets/icon/app-icon.png` (1024×1024) → Android
      `mipmap` setleri Android Studio'nun Image Asset aracıyla üretilir.
- [ ] Ekran görüntüleri: telefon (1080×1920) — lobi, rol kartı, gece
      seçimi, oylama, sonuç ekranı (5 adet yeterli).
- [ ] Kısa açıklama (80 karakter) ve uzun açıklama — tr + en.
- [ ] Gizlilik politikası URL'i: oyun sunucuya veri göndermez, veriler
      yalnız cihazda ve oyuncular arasında P2P akar; bunu yazan tek
      sayfalık bir metin yeterli.
- [ ] İçerik derecelendirmesi anketi (şiddet: hafif tematik).

## iOS yayın (6 Ekim 2026)

Mac yok, gerek de yok: `ios/` klasörü depoda duruyor ve
`.github/workflows/ios.yml` macOS runner'da derleyip TestFlight'a
yüklüyor. Depo public olduğu için macOS dakikaları ücretsiz.

### Sabitler

| | Değer |
|---|---|
| Takım kimliği (Team ID) | `K7H463X474` |
| Paket kimliği | `com.lampwickgames.biteclub` (Android ile aynı, App ID kayıtlı) |
| App Store adı | Bite Club — Vampir Köylü |
| Birincil dil | Türkçe |
| SKU | `biteclub-ios` |
| Sürüm | `MARKETING_VERSION 2.2`, derleme numarası iş akışına elle girilir |

### iPhone'a kilitlendi — bilerek

`TARGETED_DEVICE_FAMILY = 1`. iPad'i açmak Apple'ın iPad ekran
görüntülerini (13" 2064x2752) ve iPad düzeninin incelemeden geçmesini
şart koşuyor. İlk sürümde risk/iş oranı kötü; iPad desteği sonraki bir
sürümde eklenebilir, geri alınamaz bir karar değil.

### Ekran görüntüleri

Apple TEK ölçü istiyor: 6,9" iPhone için **1290x2796**. Play'in
1080x2122'lik kareleri `store/screens/ios.sh` ile çevriliyor; betik
ölçüyü doğrulamadan çıkmıyor. Çıktı `store/screens/ios/`.

### Reklam kimlikleri PLATFORMA GÖRE

AdMob'da Android ve iOS ayrı birer uygulama; birim kimlikleri de ayrı.
Yanlış platformun kimliğiyle istek atmak hata vermiyor — reklam gelmiyor
ve istek "geçersiz etkinlik" sayılabiliyor.

`.env.production.local` (depoda yok):

```
VITE_ADMOB_INTERSTITIAL=...        # Android
VITE_ADMOB_REWARDED=...            # Android
VITE_ADMOB_INTERSTITIAL_IOS=...    # iOS
VITE_ADMOB_REWARDED_IOS=...        # iOS
```

Seçim çalışma zamanında, `Capacitor.getPlatform()` ile. Testi
`src/monetization/adUnits.test.ts`; platform ayrımı kaldırılınca 2 test
düşüyor — kontrol edildi.

`ios/App/App/Info.plist` içindeki `GADApplicationIdentifier` **hâlâ
Google'ın test kimliği**. AdMob'da iOS uygulaması açılınca gerçeğiyle
değiştirilmeli; o anahtar yanlışsa Google Mobile Ads SDK açılışta
çöküyor.

### GitHub Secrets (iş akışı bunlarsız başlamıyor)

| Sır | Nereden |
|---|---|
| `APPLE_TEAM_ID` | `K7H463X474` |
| `APPSTORE_ISSUER_ID` | App Store Connect → Integrations → Keys, sayfanın üstü |
| `APPSTORE_KEY_ID` | Aynı sayfadaki anahtarın Key ID'si |
| `APPSTORE_PRIVATE_KEY` | `.p8` dosyasının içeriği, BEGIN/END satırları dahil |

`.p8` Apple'da **bir kez** iniyor; kaybolursa anahtar iptal edilip
yenisi üretilir. Sırları depoya yazan yok, Settings → Secrets'tan
girilir.

### Apple'ın kendi kapıları

- **Trader status** (App Store Connect → Business): AB'de dağıtım için
  zorunlu, beyan sahibinin kendisi doldurmalı.
- **App Privacy**: AdMob reklam kimliği topluyor; "Identifiers →
  Device ID, üçüncü taraf reklamcılık" işaretlenmeli.
- **Geri yükleme düğmesi**: 3.1.1 gereği, `RestorePurchases.tsx` ile
  zaten var.
- **ATT metni**: `NSUserTrackingUsageDescription` dolu. Belirsiz metin
  sık bir ret sebebi.
