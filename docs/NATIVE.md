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

**15 Ekim 2026'da uygulandı.** O güne kadar plan buradaydı ama kod yoktu:
WhatsApp'tan paylaşılan davet bağlantısı hem Android'de hem iOS'ta siteyi
açıyordu.

### Neden açılmıyordu — üç ayrı eksik

1. **Bağlantının biçimi.** `joinLink()` `.../#/join/KOD` üretiyordu. App Links
   ve Universal Links eşleşmeyi **yol** üzerinden yapıyor; `#` sonrası yolun
   parçası değil, yani adresin yolu sadece `/`. Yakalamak için alan adının
   tamamını sahiplenmek gerekirdi — o da ana sayfayı, gizlilik ve nasıl
   oynanır sayfalarını uygulamaya çekerdi. Artık `.../join/KOD`.
2. **Sahiplenme beyanı yoktu.** AndroidManifest'te yalnız MAIN/LAUNCHER
   süzgeci vardı; iOS'ta Associated Domains yetkisi hiç yoktu.
3. **Doğrulama dosyaları yoktu.** `/.well-known/assetlinks.json` ve
   `/.well-known/apple-app-site-association` 200 dönüyordu ama içerik
   `index.html`'di (SPA yedeği).

Üçü de sessiz: hata yok, log yok, kilitlenme yok. Sistem doğrulayamayınca
tarayıcıya düşüyor.

### Uygulama kurulu değilse ne oluyor

Aynı adres tarayıcıda açılıyor, `roomFromLocation()` kodu **yoldan** okuyor
ve oda kodu alanı doluyor. Web akışı bilerek korundu.

### Dosyalar Worker'dan servis ediliyor

`worker/index.ts` → `wellKnownResponse()`. `public/` içine konmadı çünkü:

- `apple-app-site-association` **uzantısız**; statik servis onu doğru içerik
  türüyle vermiyor, Apple `application/json` bekliyor.
- `not_found_handling: single-page-application` dosya bulunamazsa index.html
  döndürüyor; doğrulama sessizce 200/HTML alıp başarısız oluyor.

**`wrangler.jsonc` → `run_worker_first` listesine eklenmeleri ŞART.** Statik
servis Worker'dan önce çalışıyor; liste dışındayken ikisi de SPA yedeğine
düşüyordu. İlk denemede tam olarak bu oldu.

### Parmak izleri

`assetlinks.json` içinde **iki** SHA-256 var:

| Anahtar | Nereden | Niçin gerekli |
|---|---|---|
| Uygulama imzalama | Play Console → Uygulama bütünlüğü | Play'den inen her kurulum bununla imzalı |
| Yükleme | aynı sayfa | Yerelde derlenip doğrudan kurulan APK bununla imzalı |

Yalnız ilkini yazmak elle kurulan test paketlerinde derin linki sessizce
bozar.

### Sahiplenilen yol: yalnız `/join/*`

Android `pathPrefix="/join"`, iOS AASA `"/": "/join/*"`. Alan adının tamamını
sahiplenmek ana sayfayı ve bilgi sayfalarını da uygulamaya yönlendirirdi.

### Özel şema

`vampirkoylu://join/KOD` — iki platformda da tanımlı. Universal Link asıl
yol; bu, alan adı doğrulaması yapılamadığında (yerel test) çalışan yedek.

### Bekçiler

`worker/deepLink.test.ts` ve `src/util/identity.test.ts`: bağlantının hash
içermediğini, manifest/entitlements'ın alan adını sahiplendiğini, iki parmak
izinin de bulunduğunu ve sahiplenilen yolun `/join/*` ile sınırlı kaldığını
doğruluyor. Eski hatalı hale dönülünce 5 test düşüyor (denendi).

### Yayına çıktıktan sonra doğrulama

```
curl -sD- https://biteclub.lampwickgames.com/.well-known/assetlinks.json | head -3
curl -sD- https://biteclub.lampwickgames.com/.well-known/apple-app-site-association | head -3
```
İkisi de `content-type: application/json` dönmeli. Android tarafında cihazda:
`adb shell pm verify-app-links --re-verify com.lampwickgames.biteclub`

**Android'de yeni sürüm kurulmadan çalışmaz** (süzgeçler manifest'te) ve
**iOS'ta yeni derleme gerekir** (yetki pakette). Mevcut kurulumlar
tarayıcıda açmaya devam eder.

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

## App Store mağaza metinleri

Play'den farkları: Apple'da **alt başlık** ve **anahtar kelimeler** alanları
var, Play'de yok. Anahtar kelimeler 100 karakter, virgülle ayrılır ve
**boşluk konmaz** (boşluk da karakter sayılıyor). Uygulama adındaki
kelimeler zaten dizine giriyor, onları tekrar yazmak yer israfı — bu
yüzden listede "bite club" ya da "vampir" yok.

**Tanıtım metni** incelemeye girmeden değiştirilebilen tek alan; kampanya
ya da duyuru için orayı kullan.

### Ortak alanlar

| Alan | Değer |
|---|---|
| Destek adresi | `https://biteclub.lampwickgames.com/nasil-oynanir` |
| Pazarlama adresi | `https://biteclub.lampwickgames.com` |
| Gizlilik politikası | `https://biteclub.lampwickgames.com/privacy` |
| Telif | `2026 Lampwick Games` |
| Kategori | Birincil: **Games → Party**, ikincil: **Games → Word** değil → **Trivia** da değil; ikincil boş bırakılabilir |

### Türkçe (birincil dil)

**Alt başlık (30):**
```
Aranızda kan içen biri var
```

**Tanıtım metni (170):**
```
On bir rol, dörtten yirmi dörde kadar oyuncu. Anlatıcıya gerek yok: telefon rolleri dağıtır, geceleri yönetir, sırları saklar.
```

**Anahtar kelimeler (100):**
```
kurt adam,mafya,parti oyunu,grup,arkadaş,sosyal çıkarım,blöf,gece,köy,kan,oylama
```

**Açıklama:** Play'deki Türkçe uzun açıklamanın aynısı (§11).

### İngilizce (en-US)

**Alt başlık (30):**
```
One of you drinks blood
```

**Tanıtım metni (170):**
```
Eleven roles, four to twenty-four players. No moderator needed: the phone deals the roles, runs the nights and keeps every secret.
```

**Anahtar kelimeler (100):**
```
werewolf,mafia,party game,group,friends,social deduction,bluff,night,village,blood
```

**Açıklama:** Play'deki İngilizce uzun açıklamanın aynısı (§11).

### Sürüm numarası 2.2 olacak, 1.0 değil

App Store Connect uygulamayı `1.0` ile açtı. Düzeltilecek: web, Android ve
iOS'un sürümü **her zaman aynı** olmalı — bu kullanıcının koyduğu kural ve
"hangi sürümde ne var" sorusunu tek bir numaraya indiriyor. Paket zaten
`MARKETING_VERSION 2.2` ile derleniyor; App Store'daki sürüm dizesi onunla
birebir uyuşmak zorunda, yoksa yükleme reddediliyor.

### App Privacy anketi — doğru cevaplar

En sık ret sebeplerinden biri burası. Topladığımız veri:

| Veri türü | Topluyor muyuz | Niçin | Kimliğe bağlı mı |
|---|---|---|---|
| **Device ID** (reklam kimliği / IDFA) | **Evet** | Üçüncü taraf reklamcılık, analiz | Hayır, takip için kullanılıyor → "Used for Tracking" **Evet** |
| Purchases | **Evet** | Uygulama işlevi (satın alma geçmişi) | Hayır |
| Crash/Performance | Hayır | Toplamıyoruz, SDK yok | — |
| Contact Info, Location, Contacts, Photos | Hayır | Hiçbirine erişmiyoruz | — |
| User Content | Hayır | Oyun içi konuşma kaydedilmiyor, sesli sohbet yok | — |
| Identifiers → User ID | Hayır | Hesap yok, giriş yok | — |

Reklam kimliği "tracking" sayıldığı için ATT izni zorunlu — `Info.plist`'te
`NSUserTrackingUsageDescription` dolu, `adGate.ts` izni SDK başlamadan
istiyor.

## App Store Connect — doldurulan alanlar (6 Ekim 2026)

Sırası önemli: **App Privacy yayınlanmadan**, **IAP incelemeye
eklenmeden** ve **derleme işlenmeden** sürüm gönderilemiyor.

### App Privacy (yayınlandı)

| Veri türü | Amaç | Kimliğe bağlı | Takip |
|---|---|---|---|
| Device ID | Üçüncü taraf reklamcılık | Hayır | **Evet** |
| Advertising Data | Üçüncü taraf reklamcılık | Hayır | **Evet** |
| Purchase History | Uygulama işlevi | Hayır | Hayır |

`Advertising Data` planda yoktu, sonradan eklendi: Google Mobile Ads SDK
gösterim/tıklama verisini Google'a gönderiyor, bu Apple'ın "Usage Data →
Advertising Data" tanımına birebir giriyor. Yalnız Device ID beyan etmek
eksik beyan olurdu — en sık ret sebeplerinden biri.

Gizlilik politikası adresi: `https://biteclub.lampwickgames.com/privacy`.

### `premium_roles` (Apple ID 6819822416)

| Alan | Değer |
|---|---|
| Tür | Non-Consumable |
| Referans adı | Tüm Roller |
| Ülkeler | 181 (hepsi) |
| Taban fiyat | ABD $3,99 |
| Türkiye | **elle ₺149,99** |
| Vergi kategorisi | Match to parent app |
| Family Sharing | Kapalı |

**Türkiye fiyatı elle sabitlendi.** Apple $3,99 tabanından ₺199,99
öneriyordu (Türk KDV'si + kur). Play'de ürün ₺149,99 — sürüm/fiyat
paritesi kullanıcının koyduğu kural, o yüzden Apple'da da ₺149,99'a
çekildi. **Bedeli var:** elle verilen fiyat Apple'ın otomatik kur/vergi
güncellemesinin dışında kalıyor, yani enflasyonla birlikte dolar
karşılığı eriyor. Geri almak tek tık: Price Schedule → Edit → Türkiye →
"$3,99 (USD) Price" seçeneği.

Adlar ve açıklamalar (sınır: ad 35, açıklama 55 karakter):

| Dil | Ad | Açıklama |
|---|---|---|
| Türkçe | Tüm Roller | Üç premium rol kalıcı açılır, masadaki herkese. |
| English (U.S.) | All Roles | Three premium roles, unlocked for your whole table. |

### IAP inceleme ekran görüntüsü — ölçü tuzağı

Apple burada **uygulama ekran görüntüsü ölçülerini** istiyor, belgelerde
yazan "en az 640x920" yetmiyor:

- 860x1310 → *"The dimensions of one or more screenshots are wrong."*
- 1290x2796 → ölçü geçti ama **yükleme hep hata verdi**
  (*"There was an error uploading your screenshot"*), istek Apple'ın
  varlık sunucusuna hiç gitmedi
- **1242x2208 → geçti.** Kullanılan ölçü bu.

Kare `store/screens/ios/iap/premium-offer.png` — lobideki "Kilitli
roller" kartının gerçek ekran görüntüsü. Üretmek için `isNativeApp()`
geçici olarak true yapıldı (teklif webde hiç render edilmiyor), kare
alındıktan sonra yama geri alındı.

### Sürüm 2.2 — App Review bilgileri

- **Giriş gerekmiyor:** hesap sistemi yok, "Sign-in required" işaretsiz.
- **Tek cihazla test:** notlarda "Oda Kur → Bot ekle ×3 → Oyunu Başlat"
  anlatıldı. Dört oyuncu şartı yüzünden bu şart; yazılmazsa inceleyen
  oyunu hiç başlatamaz.
- **Yayın biçimi:** onaydan sonra otomatik.
- **Fiyat:** ücretsiz · **Ülke:** 175 (hepsi, gelecekte eklenenler dahil).
- **İletişim:** hesap sahibi, telefon ve e-posta girildi.

**TUZAK — "Sign-in required" varsayılan olarak İŞARETLİ geliyor.**
İşaretliyken kullanıcı adı/şifre boş kalınca Apple App Review
bilgilerini (iletişim + notlar) **hiç kaydetmiyor**: Kaydet düğmesi
"Saved" diyor, hata yok, ama `appStoreReviewDetails` isteği gitmiyor ve
sayfa yenilenince alanlar boş. Kutu kaldırılınca POST 201 ile kaydoldu.
Bir sonraki sürümde ilk bakılacak yer burası.

### İhracat uyumu (export compliance)

Derleme "Missing Compliance" ile takıldı. Cevap: **"None of the
algorithms mentioned above"** — uygulama şifrelemeyi yalnız işletim
sisteminden kullanıyor (HTTPS/WSS ve WebRTC, WebKit içinden), kendi
algoritması yok. Bu soru her derlemede tekrar gelmesin diye
`Info.plist`'e `ITSAppUsesNonExemptEncryption = false` eklendi; bir
sonraki derlemeden itibaren geçerli.

### Gönderim

**İlk deneme (derleme 1) geri döndü — ITMS-91064.** Kök
`PrivacyInfo.xcprivacy`'de `NSPrivacyTracking = true` ama
`NSPrivacyTrackingDomains` boştu; Apple ikisini tutarlı istiyor. Alan adı
yazmak çözüm değildi (iOS ATT'ye "hayır" diyende o alan adlarını
engelliyor, reklamlar ölürdü). Google Mobile Ads'in manifestindeki gibi
üst düzey izleme anahtarları kaldırıldı, izleme veri türü düzeyinde
kaldı. `privacyManifest.test.ts` bunu bekçiliyor.

**Derleme 1'in içinde yalnız DEMO reklam birimleri vardı.** CI'da
`.env.production.local` yok; kimlikler artık `ios.yml`'de, ve
`BITECLUB_CANLI_REKLAM=1` ile `check-build.mjs` dört canlı birim yoksa
derlemeyi düşürüyor. Derleme 2 paketi açılıp doğrulandı: dört canlı
birim, düzeltilmiş manifest, `ITSAppUsesNonExemptEncryption = false`
(ihracat sorusu bu derlemede kendiliğinden geçti).

**Eski gönderi iptal edilip yeniden gönderildi.** Derleme 2 sürüme
bağlanınca eski gönderi "Waiting for Review" görünmeye devam etti ama
öğeleri API'de `READY_FOR_REVIEW`, sürüm `PREPARE_FOR_SUBMISSION`'daydı —
kuyrukta gerçekte bir şey yoktu. İptal edildi (IAP o sırada `IN_REVIEW`
idi; iptal onu da geri çekti, *Developer Rejected* oldu) ve ikisi yeni
bir gönderide yollandı. 7 Ekim 2026 09:11: gönderi, sürüm (derleme 2) ve
IAP üçü de `WAITING_FOR_REVIEW`. Onaydan sonra otomatik yayın.

### İngilizce (en-US) yerelleştirme

| Alan | Değer |
|---|---|
| Ad | **Bite Club — Vampire Villager** |
| Alt başlık | One of you drinks blood |
| Gizlilik adresi | aynı (`/privacy`, sayfa iki dilli) |
| Açıklama / tanıtım / anahtar kelimeler | §App Store mağaza metinleri + Play §11 |

Yalnız **"Bite Club" alınamadı**: Apple'da adlar mağaza genelinde tekil,
başka bir uygulamada kayıtlı. Türkçe adın birebir karşılığı seçildi.

**Ekran görüntüleri — 2.3 İLE YÜKLENECEK.** İngilizce arayüzden yedi
kare çekildi: `store/screens/ios/en/` (1206x2622, nasıl çekildiği
`OKU.txt`'te). 2.2 incelemedeyken yüklenemedi — Apple "Can't Create
Screenshot Set while In Review" diyor ve yayındaki bir sürümün kareleri
yalnız yeni sürümle değişiyor. Kullanıcı kararı (7 Ekim 2026): 2.2'yi
geri çekmek yerine 2.3'te en-US'nin `APP_IPHONE_61` yuvasına yüklenecek.
O zamana kadar İngilizce sayfa Türkçe kareleri gösteriyor.

**Apple 2.3.2 — açıklama ücretli öğeleri söylemeli.** İki dilde de "11
rol" yazıyordu ama üçü ücretli. İkisine de eklendi: Büyücü, Kan Büyücüsü
ve Sisler Vampiri tek seferlik satın almayla ya da ödüllü reklamla bir
oyunluğuna açılır.

**Apple 1.5 — destek adresinde iletişim yolu.** Destek adresi olan
`nasil-oynanir.html`'de e-posta yoktu; altbilgiye iki dilli
`info@lampwickgames.com` satırı eklendi.

### Güney Kore

Apple'ın "tümü" listesi 175 ülke ve Kore yaş sınıflandırmasında ayrıca
**GRAC RCN** istiyor (Play'de IARC bunu kapsıyordu, Apple'da kapsamıyor).
Ülke listesi olduğu gibi bırakıldı; Kore'de yayın RCN alınana kadar
açılmayacak, bu sürümü bloke etmiyor.

## Simge ve açılış ekranı — ŞABLON TUZAĞI (13 Ekim 2026)

`npx cap add ios/android` platform klasörünü Capacitor'ın **kendi şablon
görselleriyle** kuruyor: beyaz zeminde mavi bir işaret. Hiçbir şeyi bozmuyor
— derleme geçiyor, testler geçiyor, uygulama açılıyor — ve öylece mağazaya
gidiyor. Gitti de:

- **iOS 2.2 (derleme 2) incelemeden döndü:** Guideline 2.3.8, *"the app icons
  appear to be placeholder icons"*. İnceleme cihazı iPad Air 11" (M3);
  uygulama iPhone'a kilitli olsa da iPad iPhone uygulamalarını çalıştırıyor.
- **Açılış ekranı iki platformda da şablondu** ve ikisinde de gerçekten
  gösteriliyor: iOS `LaunchScreen.storyboard` (`Splash` görseli,
  scaleAspectFill), Android `styles.xml` → `android:background=@drawable/splash`.
  Yani Play'de yayındaki sürüm de her açılışta Capacitor'ın işaretini
  gösteriyordu.
- Android'in **uygulama simgesi** doğruydu (adaptive icon, `#471A83` zemin).

**Üretim:** `node scripts/make-native-assets.mjs` — hepsini
`public/assets/icon/app-icon.png`'den türetiyor. Simge değişirse tekrar
çalıştır, sonra `npm test`.

| Çıktı | Ölçü | Not |
|---|---|---|
| iOS simge | 1024x1024 | **alfasız RGB** — alfalı dosyayı Apple reddediyor |
| iOS açılış | 2732x2732 ×3 | Contents.json 1x/2x/3x için aynı ölçüyü istiyor |
| Android açılış | 11 dosya | yoğunluk/yön varyantları, ölçüleri korunuyor |

Açılış ekranının zemini simgenin kendi moru (`#461B83`): simge karesi zemine
oturunca ek yeri görünmüyor, logo havada duruyor gibi oluyor.

**Bekçi:** `src/util/nativeAssets.test.ts` PNG'yi zlib ile açıp köşe
piksellerine bakıyor; marka moru değilse düşüyor. Ölçüt renk, hash değil —
yeniden kodlama hash'i değiştirir ama görseli değiştirmez. Apple'ın
reddettiği dosyalar geri konunca 7 test düşüyor (denendi).

## AdMob doğrulaması — app-ads.txt İKİ alanda (24 Ekim 2026)

iOS 2.2 onaylandıktan sonra AdMob'daki iOS uygulaması mağaza kaydına
bağlandı ("Sınırlı reklam sunumu" bu yüzden duruyordu). Mağaza bağlandı,
ama **doğrulama düştü**:

> Bir app-ads.txt dosyası oluşturmuş olabilirsiniz, ancak bilgileriniz
> AdMob hesabınızdaki bilgilerle eşleşmiyor.

Sebep, `.well-known` dosyalarındaki sessiz arızanın birebir aynısı:
`biteclub.lampwickgames.com/app-ads.txt` isteğine SPA yedeği
**200 + index.html** döndürüyordu. Dosya yok değildi — HTML'di.

### AdMob dosyayı NEREDE arıyor

Mağaza girişindeki geliştirici adresinin **kökünde**. İki mağaza iki ayrı
alan gösteriyor:

| Mağaza | Gösterdiği alan | Dosyanın yeri |
|---|---|---|
| Google Play | `lampwickgames.com` | `site/public/app-ads.txt` (stüdyo sitesi) |
| App Store | `biteclub.lampwickgames.com` | `worker/index.ts` → `APP_ADS_TXT` |

Android bu yüzden ilk günden "Hazır"dı, iOS değildi. App Store'un hangi
adresi bildirdiği Apple'ın kendi API'sinden doğrulanabiliyor:

```bash
curl -s "https://itunes.apple.com/lookup?id=6819688814" | grep -o '"sellerUrl":"[^"]*"'
# "sellerUrl":"https://biteclub.lampwickgames.com"
```

`sellerUrl` = ASC'deki **Marketing URL**. Değiştirilirse app-ads.txt de
o alana taşınmalı.

### Çözüm

Worker'dan `text/plain` olarak servis + `wrangler.jsonc` →
`run_worker_first` listesine `/app-ads.txt`. Liste adımı ŞART: statik
servis Worker'dan önce çalışıyor.

```bash
curl -sD- https://biteclub.lampwickgames.com/app-ads.txt | head -3
# HTTP/1.1 200 OK
# Content-Type: text/plain; charset=utf-8
```

**Bekçiler** (`worker/deepLink.test.ts`): içerik türünün `text/plain`
olduğunu, iki kopyanın aynı yayıncı satırını taşıdığını ve yayıncı
numarasının reklam birimleriyle aynı hesaptan olduğunu doğruluyor.
`/app-ads.txt` girdisi silinince test düşüyor (denendi).

### Doğrulama ANINDA olmuyor

Dosya düzeldikten sonra "Güncellemeleri kontrol edin" hemen yeşile
dönmüyor; AdMob'un tarayıcısı kendi döngüsünde çalışıyor ve **24 saati
bulabiliyor**. O süre boyunca iOS'ta "Sınırlı reklam sunumu" yazmaya
devam eder — yapılacak bir şey yoktur, beklenecektir.

## 2.3 — İngilizce kareler ve R8 (24 Ekim 2026)

iOS 2.2 (derleme 4) onaylanıp yayına çıktıktan sonra açılan sürüm.

### iOS 2.3 (derleme 5)

**Uygulama tarafında değişiklik yok** — 2.2 derleme 4 ile aynı web paketi.
Sürümün sebebi mağaza sayfası: canlı bir sürümün kareleri değiştirilemiyor,
bunun için yeni sürüm açmak gerekiyor. 7 İngilizce kare
(`store/screens/ios/en/`, 1206x2622) en-US yerelleştirmesine yüklendi;
böylece İngilizce sayfa artık Türkçe kare göstermiyor.

Takıldığımız iki nokta:

- **Kareler iki ayrı sekmede.** "Header and Search Results" yeni pazarlama
  varlıkları; klasik cihaz kareleri **"App Previews and Screenshots"**
  sekmesinde. İlkine bakıp "kare yuvası yok" sanmak kolay.
- **Yeni sürüm karelerı yalnız VAR OLAN dillere taşıyor.** tr'nin 7 karesi
  2.2'den geldi, en-US boş açıldı (`appScreenshotSets: []`). Arayüz bunu
  söylemiyor; API söylüyor.
- `04-night.png` yüklemede `UPLOAD_COMPLETE` durumunda takıldı (hata yok,
  arayüzde bulut simgesi). Silip yeniden yüklemek çözdü; sıra bozulunca
  `appScreenshotSets/<id>/relationships/appScreenshots` PATCH ile düzeltildi.

**Gönderim yine iki adım:** "Add for Review" öğeyi yalnız sahneye koyuyor
(`Ready for Review`), gerçek gönderim gönderim sayfasındaki
**"Submit for Review"**. 2.1(b) reddinin sebebi tam buydu; bu sefer
gönderimden sonra `WAITING_FOR_REVIEW` olduğu doğrulandı.

`premium_roles` bu gönderime dahil DEĞİL — zaten `APPROVED` ve canlı,
dokunulmadı.

### Android 20 (2.3)

R8 açıldı; ayrıntısı `docs/PLAY-STORE.md` §17. Paket `scripts/check-aab.mjs`
ile denetleniyor.
