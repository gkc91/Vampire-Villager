# Google Play — Yayın Rehberi

Bu dosya Vampir Köylü'yü Play Store'a çıkarmak için gereken **her adımı**
sırayla anlatır. Araştırma tarihi: **26 Ağustos 2026**. Play kuralları sık
değişiyor; "Console ne diyorsa o" — burada yazan bir şey Console'la
çelişirse Console'a uy ve bu dosyayı güncelle.

> **Neden bu kadar detaylı:** paket adı, ücretsiz/ücretli seçimi ve
> imzalama anahtarı gibi bazı kararlar **geri alınamaz**. Yanlış seçim,
> uygulamayı silip baştan yayınlamak demek — indirmeler ve yorumlar gider.

---

## 0. Şu an bizde ne var, ne eksik

| | Durum |
|---|---|
| Node | v24 ✅ (Capacitor 8 için 22+ gerekiyor) |
| JDK | 17 ✅ (Capacitor 8 çalışır, 21 önerilir) |
| Android SDK | ❌ kurulacak (~1 GB) |
| Capacitor | 6 → **8'e yükseltilecek** (targetSdk 36 için) |
| `capacitor.config.ts` | ✅ hazır (`com.vampirkoylu.app`) |
| Derin link yakalama | ✅ `src/util/deepLink.ts` |
| Gizlilik politikası | ❌ yazılacak, bir adreste yayınlanacak |
| Mağaza görselleri | ❌ üretilecek |

---

## 1. Hesap açma (BUGÜN başlat — kimlik doğrulama günler sürebilir)

1. <https://play.google.com/console> → **Kişisel** hesap seç.
   - Kuruluş hesabı D-U-N-S numarası ister (ücretsiz ama 30 güne kadar
     sürebiliyor). Şahıs olarak kişisel hesap doğru seçim.
2. **25 $** tek seferlik kayıt ücreti (kartla).
3. **Kimlik doğrulama:** resmi kimlik + adres belgesi istenir. Onay
   birkaç gün sürebilir — bu yüzden APK'yı beklemeden başlat.
4. **Hangi Google hesabı?** Kişisel Gmail'ini kullanma; oyunlar için ayrı
   bir hesap aç. Play hesabı başka bir hesaba **devredilemez**; ileride
   şirketleşirsen ya da birine devredersen bu önemli olur.
5. **Ödemeler profili:** para kazanacaksan gerekli. Buraya
   **GVK mükerrer 20/B istisna hesabını** tanımla — istisnadan
   yararlanmanın şartı tüm hasılatın o hesaptan tahsil edilmesi.

---

## 2. Uygulamayı oluştururken verilen GERİ ALINAMAZ kararlar

| Karar | Neden geri alınamaz | Bizim seçim |
|---|---|---|
| **Paket adı** | Yayınlandıktan sonra asla değişmez | `com.vampirkoylu.app` |
| **Ücretsiz / Ücretli** | Ücretsiz seçilirse sonradan **ücretli yapılamaz** | **Ücretsiz** (premium uygulama içi satın alma olacak) |
| **İmzalama anahtarı** | Kaybedersen güncelleme yayınlayamazsın | Play App Signing kullan |
| **Varsayılan dil** | Sonradan değiştirmek zahmetli | Türkçe (+ İngilizce ekle) |

> **Play App Signing:** Google uygulama imzalama anahtarını kendi saklar,
> sende yalnız "upload key" olur. Upload key'i kaybedersen Google
> sıfırlayabilir — kendi anahtarını saklasaydın kaybettiğinde uygulama
> ölürdü. **Play App Signing'i aç.**

---

## 3. Teknik gereksinimler

### targetSdk 36 — ACİL
**31 Ağustos 2026'dan itibaren yeni uygulamalar ve güncellemeler Android 16
(API 36) hedeflemek zorunda.** Bugün 26 Ağustos. Yani ilk sürümü doğrudan
API 36 ile çıkaralım, sonra tekrar uğraşmayalım.

Bunun için **Capacitor 8**'e yükselmemiz gerekiyor (varsayılan targetSdk 36,
Node 22+, Java 17+/21 önerilir). Projede şu an Capacitor 6 var.

### Diğer zorunluluklar
- **Android App Bundle (.aab)** — yeni uygulamalarda APK kabul edilmiyor.
  (APK yalnız bizim elden test etmemiz için.)
- 64-bit desteği — Capacitor'da kendiliğinden geliyor.
- Sürüm kodu (`versionCode`) her yüklemede artmalı.

---

## 4. Kapalı test: 12 kişi × 14 gün (en uzun bekleyen madde)

13 Kasım 2023'ten sonra açılan **kişisel** hesaplarda üretime geçmek için:

- Kapalı test kanalına bir sürüm yüklenmeli.
- **En az 12 testçi** davet edilmeli ve **hepsi opt-in linkine tıklayıp
  uygulamayı yüklemeli.** Sadece e-posta eklemek yetmez.
- Bu 12 kişi **14 gün kesintisiz** testte kalmalı. Çıkan biri sayılmaz;
  çıkıp geri gelirse sayaç sıfırlanır.
- 14 gün dolunca Console'dan **"production access"** başvurusu yapılır;
  Google inceler (birkaç gün).

**Pratik notlar:**
- 12 değil **15-16 kişi** davet et; bir kısmı yüklemeyi unutur.
- Testçiler Google hesabı e-postalarını vermeli (Gmail).
- Test süresince en az bir güncelleme yayınlamak inceleme için iyi görünür.
- Grup listesini Console'da "Testers" altında e-posta listesi olarak tut.

---

## 5. Mağaza vitrini (hazırlanacak malzeme)

| Öğe | Gereksinim | Not |
|---|---|---|
| Uygulama adı | 30 karakter | "Vampir Köylü" |
| Kısa açıklama | 80 karakter | Aramada görünen satır |
| Uzun açıklama | 4000 karakter | TR + EN |
| Uygulama ikonu | 512×512 PNG | `assets/icon/app-icon.png` var |
| Öne çıkan görsel | 1024×500 | **yok, üretilecek** |
| Telefon ekran görüntüleri | en az 2, pratikte 4-8 | Gerçek oyundan |
| Kategori | Oyun → Parti / Kelime | |

Ekran görüntüleri için iyi adaylar: lobi + oda kodu, rol kartı, gece
seçim ekranı, oylama, oyun sonu rol açıklaması.

---

## 6. "Uygulama içeriği" beyanları (eksikse yayın durur)

- [ ] **Gizlilik politikası URL'i** — zorunlu. Reklam ve analitik
      kullanıyorsak ne topladığımızı yazmak zorundayız.
- [ ] **Reklam içerir** beyanı — AdMob koyacaksak işaretlenecek.
- [ ] **İçerik derecelendirme anketi (IARC)** — vampir/öldürme teması var;
      dürüst doldur, muhtemelen 12+ çıkar. Yanlış beyan askıya alma sebebi.
- [ ] **Hedef kitle ve içerik** — **çocuklara yönelik DEĞİL** işaretle.
      Reklam varsa çocuk kitlesi ayrı kurallar açar, oraya girme.
- [ ] **Veri güvenliği formu** — hangi veriyi topluyoruz, nereye gidiyor.
      Bizde: oyuncu takma adı (cihazda), oda kodu, bağlantı için IP
      (Cloudflare). Reklam eklenirse reklam kimliği (AD_ID) de eklenir.
      **Form ile uygulamanın gerçekte yaptığı çelişirse askıya alınır.**
- [ ] **Uygulama erişimi** — giriş gerektirmiyor, "tüm işlevler erişilebilir".
- [ ] **Devlet uygulaması değil**, finansal ürün yok.

---

## 7. Premium satın alma (Play Billing)

- Dijital ürün satışı **Play Billing zorunlu** (kendi ödeme sistemini
  koyamazsın).
- Ürün tipi: **tek seferlik / tüketilmeyen (non-consumable)** —
  "ömür boyu premium".
- Komisyon: küçük geliştiricilerde %15 (yıllık 1 milyon $ altı), üstünde
  %30. Console'dan güncel oranı teyit et.
- "Satın alımları geri yükle" akışı Play'den hazır gelir — hesap sistemi
  kurmamıza gerek yok.

---

## 8. Sırayla yapılacaklar

1. **Bugün:** Play hesabı aç, 25 $ öde, kimlik doğrulamayı başlat.
2. Android SDK kurulumu + Capacitor 8'e yükseltme + ilk `.aab`.
3. Gizlilik politikası yaz, bir adreste yayınla.
4. Mağaza görselleri (öne çıkan görsel + ekran görüntüleri).
5. Kapalı test kanalına yükle, 15-16 kişi davet et → **14 gün bekle**.
6. Beyan formlarını doldur (madde 6).
7. Production access başvurusu → inceleme → yayın.
8. Premium ürünü ve reklamı sonraki sürümde ekle (ilk sürüm sade çıksın).

---

## 9. Bizim özel risklerimiz

- **Apple 4.2 benzeri "yetersiz işlevsellik" riski Play'de daha düşük**
  ama sıfır değil. Tek cihazda "elden ele" modu eklemek her iki mağazada
  da işi sağlama alır.
- **Veri güvenliği formu** en sık askıya alınma sebebi. Reklam eklediğimiz
  gün formu güncellemeyi unutma.
- **31 Ağustos 2026 API 36 tarihi** — ilk sürümü buna göre çıkarırsak
  sonraki bir yıl bu konuyla uğraşmayız.
- **Testçi kaybı:** 14 günün 12. gününde biri uygulamayı silerse sayaç
  bozulur. Testçilere "iki hafta silmeyin" demeyi unutma.

---

## Kaynaklar

- [Play — kapalı test şartı](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [Play — hesap türleri ve D-U-N-S](https://support.google.com/googleplay/android-developer/answer/13634885?hl=en)
- [Play — target API seviyesi](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [Android — target SDK gereksinimi](https://developer.android.com/google/play/requirements/target-sdk)
- [Capacitor 8'e yükseltme](https://capacitorjs.com/docs/updating/8-0)
