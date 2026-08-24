# Native Kabuk (Capacitor) — M6

Web tarafı bittiğinde aynı kod tabanı Capacitor kabuğunda çalışır.
Platform klasörleri (`android/`, `ios/`) repoda tutulmaz, `.gitignore`'dadır;
her makinede yeniden üretilir.

## Android (öncelik)

Gerekenler: Android Studio + JDK 17 (Capacitor 6 bunu ister).

```bash
npm run build
npx cap add android
npx cap sync
npx cap open android
```

Sonraki derlemelerde `npm run build && npx cap sync` yeterlidir.

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
