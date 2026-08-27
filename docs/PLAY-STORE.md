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


---

## 10. Kurulum formlarının cevapları (Bite Club)

Play'in "Uygulamanızın kurulumunu tamamlayın" listesi. Cevaplar
uygulamanın BUGÜN yaptığına göre; reklam ve satın alma eklendiği gün
ilgili maddeler aynı gün güncellenecek.

### Uygulama içeriği

| Madde | Cevap |
|---|---|
| Gizlilik politikası | `https://biteclub.lampwickgames.com/privacy` |
| Oturum açma bilgileri | "Tüm işlevler kısıtlama olmadan kullanılabilir" — giriş yok |
| Reklam | **Hayır**, uygulamada reklam yok (şimdilik) |
| Resmi kurum uygulamaları | Hayır |
| Finans ile ilgili özellikler | Hayır |
| Sağlık | Hayır |
| Hedef kitle | **13 yaş ve üzeri.** Çocuk yaş gruplarını İŞARETLEME |

> **Çocuk yaş grubu tuzağı:** işaretlersen Play'in Aile Politikası
> devreye giriyor; reklam ağları kısıtlanıyor, reklam kimliği kullanımı
> yasaklanıyor. Oyun vampir/öldürme temalı, zaten çocuk kitlesine yönelik
> değil.

### İçerik derecelendirme (IARC anketi)

Dürüst cevapla; abartmak da eksik beyan da zarar veriyor.

- **Şiddet:** oyunda görsel şiddet YOK. Ölüm metinle anlatılıyor
  ("… bir daha uyanmayacak"), kan ya da çatışma gösterilmiyor. Kart
  görselleri vampir portreleri.
- **Korku öğeleri:** hafif — karanlık atmosfer, vampir teması.
- **Kullanıcılar arası iletişim:** **yok.** Uygulamada sohbet, mesajlaşma
  ya da sesli konuşma bulunmuyor; oyuncular yüz yüze konuşuyor.
  Paylaşılan tek kullanıcı girdisi takma addır.
- **Dijital satın alma:** şu an yok.

Beklenen sonuç 12+ civarı. Sonradan reklam/satın alma eklenince anket
tekrar doldurulacak.

### Veri güvenliği — en dikkatli doldurulacak form

En sık askıya alma sebebi, formun uygulamanın gerçekte yaptığıyla
çelişmesi.

| Soru | Cevap |
|---|---|
| Veri topluyor musunuz? | **Evet** — takma ad |
| Hangi tür? | Kişisel bilgiler → **Adlar** (takma ad) |
| Amaç | Uygulama işlevi (oyuncuları birbirine göstermek) |
| Paylaşılıyor mu? | **Hayır** (üçüncü tarafa aktarılmıyor) |
| Aktarımda şifreleniyor mu? | **Evet** (HTTPS/WSS) |
| Kullanıcı silinmesini isteyebilir mi? | **Hayır** — hesap yok, veri saklanmıyor |
| Konum, kişiler, fotoğraf, mesaj | **Hiçbiri** |

Takma ad aktarıcıdan geçiyor ama kalıcı olarak saklanmıyor. IP adresi
altyapı sağlayıcı tarafından bağlantı kurmak için işleniyor; bu, sunucu
günlüğü niteliğinde ve ayrı bir veri türü olarak beyan edilmiyor.

### Kategori ve iletişim

| Alan | Değer |
|---|---|
| Uygulama türü | Oyun |
| Kategori | **Masa Oyunu** (alternatif: Sıradan) |
| E-posta | `info@lampwickgames.com` |
| Web sitesi | `https://lampwickgames.com` |

---

## 11. Mağaza girişi metinleri

Başlık dile göre değişebiliyor: Türkçe listede yerel arama için
"Vampir Köylü" geçsin, İngilizce listede sade marka kalsın.

### Türkçe

**Uygulama adı (30):**
```
Bite Club — Vampir Köylü
```

**Kısa açıklama (80):**
```
Aranızda kan içen biri var. Telefonlarınızı alın, kimin yalan söylediğini bulun.
```

**Uzun açıklama:**
```
Bite Club, arkadaşlarla masa etrafında oynanan bir sosyal çıkarım oyunu.
Vampir Köylü, Kurt Adam ve Mafya oyunlarını sevdiyseniz tanıdık gelecek —
ama bu kez kartlara, kâğıtlara ya da oyunu yöneten birine ihtiyacınız yok.

Herkes kendi telefonundan katılır. Oda kodunu paylaşırsınız, oyun rolleri
dağıtır, geceleri yönetir ve kimin ne zaman konuşacağını söyler. Siz
yalnız oynarsınız.

GECE
Vampirler kurbanını seçer. Doktor birini korur. Kâhin bir kişinin
kimliğini okur. Herkes gözlerini kapatır, telefon sırrı saklar.

GÜNDÜZ
Köy meydanı dolar. Suçlarsınız, savunursunuz, blöf yaparsınız. Sonunda
oylama: kim asılacak?

11 ROL
Köylü, Kâhin, Doktor, Dedektif, Büyücü, Avcı, Vampir, Vampir Lordu,
Kan Büyücüsü, Sisler Vampiri ve Hırsız. Her rolün kendi gece hamlesi var.
Rolleri oyunu kuran kişi seçer; oyunu masanıza göre ayarlayabilirsiniz.

İKİ OYNAMA BİÇİMİ
• Herkes kendi telefonundan — oda kodunu paylaşın, katılın
• Elden ele — tek telefonu sırayla vererek oynayın, internet gerekmez

4 kişiden 24 kişiye kadar oynanır. Anlatıcıya gerek yok, kart
kaybolmaz, kural tartışması çıkmaz.
```

### İngilizce

**Uygulama adı (30):**
```
Bite Club
```

**Kısa açıklama (80):**
```
One of you drinks blood. Grab your phones and find out who is lying.
```

**Uzun açıklama:**
```
Bite Club is a social deduction party game for friends around a table.
If you have played Werewolf or Mafia, you already know it — except this
time there are no cards to lose and nobody has to sit out as moderator.

Everyone joins from their own phone. Share the room code and the game
deals the roles, runs the nights and tells you when to speak. You just
play.

NIGHT
The vampires choose a victim. The doctor protects someone. The seer reads
one player's identity. Everyone closes their eyes; the phone keeps the
secrets.

DAY
The village square fills up. Accuse, defend, bluff. Then vote: who hangs?

11 ROLES
Villager, Seer, Doctor, Detective, Wizard, Hunter, Vampire, Vampire Lord,
Blood Sorcerer, Mist Vampire and Thief. Every role has its own night move,
and the host picks which roles are in play.

TWO WAYS TO PLAY
• Everyone on their own phone — share the room code and join
• Pass and play — one phone around the table, no internet needed

From 4 up to 24 players. No moderator, no lost cards, no arguments
about the rules.
```

---

## 12. Kapalı test kanalı ayarları

| Adım | Değer |
|---|---|
| Ülke ve bölge | **Tüm ülkeler** |
| Test kullanıcıları | E-posta listesi (`Testers`, 23 kişi) |
| Sürüm | `1.3 (5)` — imzalı `.aab` |
| Sürüm adı | `1.3 - kurallar uygulamada` |
| Geri bildirim adresi | `info@lampwickgames.com` |

> **Listedeki kişi ≠ kayıtlı test kullanıcısı.** Play'in sayacı
> ("An itibarıyla N test kullanıcısı kayıtlı") listeye eklenen
> e-postayı değil, katılma linkini açıp uygulamayı KURAN kişiyi
> sayıyor. 23 kişilik liste dururken sayaç 0 gösteriyordu. 14 günlük
> süre bu sayı 12'ye ulaşmadan işlemiyor.

### Yeni sürüm yükleme adımları (her seferinde aynı)

1. Kapalı test → **Yeni sürüm oluştur**
2. **Yükle** ile `.aab` seç (Kitaplıktan ekle DEĞİL — orada eski sürümler var)
3. Sürüm adı ve `<tr-TR>` etiketleri arasına sürüm notları
4. **İleri** → **Kaydet ve yayınla** → **Sürümü yayınla**

Sürüm kodu her yüklemede artmalı; aynı kod ikinci kez kabul edilmiyor.
Yayınlandıktan sonra test kullanıcılarına ayrıca haber vermeye gerek yok,
Play güncellemeyi kendi indiriyor. 14 günlük sayaç sürüm değişince
sıfırlanmıyor — şart testçi sayısını ve süreyi sayıyor.

### Sürüm notları (tr-TR)

```
İlk kapalı test sürümü.

Oyun 4-24 kişilik. Herkes kendi telefonundan katılır, ya da tek telefonu elden ele verirsiniz. 11 rol var; hangilerinin oynanacağını odayı kuran seçer.

Özellikle denemenizi istediklerim:
• Farklı operatörlerdeki telefonlarla aynı odaya bağlanmak
• 6 kişiden kalabalık bir masa
• Elden ele modu (internet gerekmiyor)

Takıldığınız yeri info@lampwickgames.com adresine yazarsanız sevinirim.
```

414/500 karakter. Play dil etiketiyle istiyor: metni `<tr-TR>` ve
`</tr-TR>` satırlarının ARASINA yapıştır, etiketleri silme.

> **Ülke seçimi kritik:** yalnız Türkiye seçersen değişim
> topluluğundan gelen yurt dışındaki testçiler uygulamayı **kuramaz** ve
> 12 sayısını asla tamamlayamazsın. Kapalı testte tüm ülkeleri aç.
