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
- **Dijital satın alma:** VAR (`premium_roles`, tek seferlik).
- **Reklam:** VAR (oyun sonu geçiş + isteğe bağlı ödüllü).

**YENİDEN DOLDURULMASI GEREKİYOR.**

| | |
|---|---|
| Global Rating ID | `59118a9e-5098-8ddd-8680-3f93cc624e7b` |
| Anketin gönderildiği tarih | **26 Ağustos 2026, 20:36** |
| Sonuç | 12+ (PEGI 12, ESRB T, USK 12, vb.) |
| Mağaza | Google Play |

16 Eylül'de gelen IARC e-postası yalnız "notlar canlıya geçti"
bildirimiydi; anketin kendisi 26 Ağustos'tan kalma. O tarihte reklam da
`premium_roles` de yoktu — yani cevaplarda "dijital satın alma yok"
yazıyor ve bu artık doğru değil.

IARC anketi uygulama içi satın almayı "etkileşimli öğe" olarak soruyor;
monetizasyon eklenince anket yeniden doldurulmak zorunda (IARC şartları
md. 5). Doğru cevaplar:

- **Dijital satın alma: EVET** — tek seferlik, sabit içerik.
- **Rastgele/şans öğesi: HAYIR.** `premium_roles` ne verdiği belli üç
  rolü açıyor; loot box değil. Bu ayrım önemli, "rastgele öğe içerir"
  demek mağaza sayfasına ayrı bir uyarı etiketi ekliyor.
- Geri kalan her şey aynı: sohbet yok, kullanıcı üretimi içerik yok,
  konum paylaşımı yok, şiddet hâlâ yalnız metinle anlatılıyor.

### Anket cevapları (16 Eylül 2026'da yenilendi)

| Soru | Cevap |
|---|---|
| Şiddet, kan | **Hayır** — hiçbir şey tasvir edilmiyor, ölüm tek satır metin |
| Korku | **Evet → Ürkütücü öğeler → NADİREN** |
| Cinsellik / Kumar / Dil / Madde / Kaba mizah | Hayır |
| Dijital satın alma | **Evet → yalnız "dijital ürün satın alma"** |
| Rastgele öğe (ganimet kutusu) | **Hayır** |
| Gerçek parayla öğe takası | Hayır |
| Kullanıcı etkileşimi (sesli/mesaj/resim) | **Hayır** — uygulamada sohbet yok |
| Konum / Nazi / Kore / Terör / Suç tekniği | Hayır |

**KORKU SIKLIĞI KRİTİK.** "Sıklıkla" denedim, sonuç: USK 16, Avustralya
MA15+ (yasal kısıtlama), Suudi Arabistan 18, Tayvan PG15. "Nadiren"e
çevirince USK 12, Avustralya M (tavsiye), Suudi 16, Tayvan PG12 oldu.

Doğru cevap "Nadiren": soru atmosferi değil, ürkütücü ÖĞELERİN kullanım
sıklığını soruyor. Oyunda ani korkutma yok, rahatsız edici ses yok, kan
ya da ceset görüntüsü yok; rol görselleri stilize illüstrasyon.

Şiddet sorusu "Hayır" kalmalı: soru "ima, referans ya da tasvir" diyor
ama oyunda hiçbir şey tasvir edilmiyor. ESRB zaten kendi başına "Hafif
Şiddet" tanımlayıcısı ekliyor, yani sistem durumu doğru okuyor.

### Sonuç derecelendirmeleri

PEGI 12 · ESRB 13+ (Hafif Şiddet) · USK 12 (Karanlık Atmosfer) ·
Avustralya M · Brezilya 14+ · Kore Tüm yaşlar · Tayvan PG12 ·
Suudi Arabistan 16 · IARC Generic 12+

Her bölgede etkileşimli öğe: **Oyun İçi Satın Alma İşlemleri**.

Bu kimliği sakla: **IARC lisanslı BAŞKA bir mağazaya** (Samsung Galaxy
Store, Microsoft Store, Epic…) çıkarsan anketi yeniden doldurmuyorsun,
ürün kaydı sırasında bu kimliği giriyorsun.

**App Store IARC kullanmıyor.** Apple'ın kendi yaş derecelendirme anketi
var; iOS'a geçerken sıfırdan doldurulacak.

**Ne zaman tekrar doldurulur:** ürün, anket cevaplarını değiştirecek
şekilde değişirse (IARC şartları md. 5). Bizim için tetikleyiciler:
uygulama içi sohbet/mesajlaşma eklemek, kullanıcı üretimi içerik açmak,
ya da şiddet/korku düzeyini artıran görseller koymak. Rol eklemek ya da
hata düzeltmek tetiklemez.

### Veri güvenliği — en dikkatli doldurulacak form

En sık askıya alma sebebi, formun uygulamanın gerçekte yaptığıyla
çelişmesi.

> **10 Eylül 2026'da güncellendi:** reklam eklendi, form da değişti.
> Reklam kimliği beyanı (Politika → Uygulama içeriği → Reklam Kimliği)
> "Evet / Reklam veya pazarlama" olarak verildi; veri güvenliği formu
> onunla TUTARLI olmak zorunda, yoksa askıya alma sebebi.

| Soru | Cevap |
|---|---|
| Veri topluyor musunuz? | **Evet** — takma ad + reklam kimliği |
| Hangi tür? | Kişisel bilgiler → **Adlar** (takma ad)<br>Cihaz veya diğer kimlikler → **Cihaz veya diğer kimlikler** (reklam kimliği) |
| Takma adın amacı | Uygulama işlevi (oyuncuları birbirine göstermek) |
| Reklam kimliğinin amacı | **Reklamcılık veya pazarlama** |
| Paylaşılıyor mu? | Takma ad: **Hayır**<br>Reklam kimliği: **Evet** — AdMob üzerinden Google'a |
| Toplama zorunlu mu? | Reklam kimliği **zorunlu** (kullanıcı kapatamıyor; kişiselleştirmeyi cihazdan kapatabilir) |
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

NASIL OYNANIR
Herkes kendi telefonundan katılır — oda kodunu paylaşın, oyuna girin.

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

HOW TO PLAY
Everyone joins from their own phone — share the room code and play.

From 4 up to 24 players. No moderator, no lost cards, no arguments
about the rules.

### Diğer diller (6 Ekim 2026'da eklendi)

Uygulama adında markadan sonra o dildeki **tür adı** var: Play araması
"Werwolf", "Loup-Garou", "人狼" gibi yerel terimlerle yapılıyor. Kısa
açıklama 80, uzun açıklama 4000 karakterle sınırlı.

#### Almanca — de-DE

```
Bite Club — Werwolf & Vampire
```
```
Einer von euch trinkt Blut. Nehmt eure Handys und findet heraus, wer lügt.
```
```
Bite Club ist ein Partyspiel für Freunde am Tisch — soziale Deduktion,
wie ihr sie von Werwolf oder Mafia kennt. Nur gibt es diesmal keine
Karten, die verloren gehen, und niemand muss als Spielleiter zusehen.

Alle spielen vom eigenen Handy. Teilt den Raumcode, und das Spiel
verteilt die Rollen, führt durch die Nächte und sagt euch, wann
gesprochen wird. Ihr spielt einfach.

NACHT
Die Vampire wählen ihr Opfer. Der Arzt beschützt jemanden. Die Seherin
liest die Identität eines Spielers. Alle schließen die Augen — das Handy
bewahrt die Geheimnisse.

TAG
Der Dorfplatz füllt sich. Beschuldigen, verteidigen, bluffen. Dann die
Abstimmung: wer wird gehängt?

11 ROLLEN
Dorfbewohner, Seherin, Arzt, Detektiv, Magier, Jäger, Vampir,
Vampirfürst, Blutmagier, Nebelvampir und Dieb. Jede Rolle hat ihren
eigenen Zug in der Nacht, und der Gastgeber entscheidet, welche Rollen
im Spiel sind.

SO WIRD GESPIELT
Alle treten vom eigenen Handy bei — Raumcode teilen und losspielen.

Für 4 bis 24 Spieler. Kein Spielleiter, keine verlorenen Karten, kein
Streit über die Regeln.
```

#### Fransızca — fr-FR

```
Bite Club — Loups-Garous
```
```
L'un de vous boit du sang. Prenez vos téléphones et trouvez qui ment.
```
```
Bite Club est un jeu de déduction sociale à jouer entre amis, autour
d'une table. Si vous connaissez Loups-Garous ou Mafia, vous êtes chez
vous — sauf qu'ici aucune carte ne se perd et personne n'est obligé de
rester meneur de jeu.

Chacun joue depuis son propre téléphone. Partagez le code de la partie :
le jeu distribue les rôles, gère les nuits et vous dit quand parler.
Vous n'avez qu'à jouer.

LA NUIT
Les vampires choisissent une victime. Le médecin protège quelqu'un. La
voyante lit l'identité d'un joueur. Tout le monde ferme les yeux — le
téléphone garde les secrets.

LE JOUR
La place du village se remplit. Accusez, défendez-vous, bluffez. Puis le
vote : qui sera pendu ?

11 RÔLES
Villageois, Voyante, Médecin, Détective, Sorcier, Chasseur, Vampire,
Seigneur Vampire, Sorcier de Sang, Vampire des Brumes et Voleur. Chaque
rôle a son action de nuit, et l'hôte choisit les rôles en jeu.

COMMENT JOUER
Chacun rejoint depuis son téléphone — partagez le code et c'est parti.

De 4 à 24 joueurs. Pas de meneur, pas de cartes perdues, pas de disputes
sur les règles.
```

#### İspanyolca (İspanya) — es-ES

```
Bite Club — Hombres Lobo
```
```
Alguien entre vosotros bebe sangre. Coged los móviles y descubrid quién miente.
```
```
Bite Club es un juego de deducción social para jugar con amigos
alrededor de una mesa. Si habéis jugado a Hombres Lobo o a Mafia, ya lo
conocéis — solo que esta vez no hay cartas que perder y nadie tiene que
quedarse fuera haciendo de narrador.

Cada uno juega desde su propio móvil. Compartís el código de la sala y
el juego reparte los roles, dirige las noches y os dice cuándo hablar.
Vosotros solo jugáis.

NOCHE
Los vampiros eligen víctima. El médico protege a alguien. La vidente lee
la identidad de un jugador. Todos cierran los ojos — el móvil guarda los
secretos.

DÍA
La plaza del pueblo se llena. Acusad, defendeos, farolead. Y después la
votación: ¿a quién colgamos?

11 ROLES
Aldeano, Vidente, Médico, Detective, Hechicero, Cazador, Vampiro, Señor
Vampiro, Brujo de Sangre, Vampiro de la Niebla y Ladrón. Cada rol tiene
su jugada nocturna, y el anfitrión decide qué roles entran en partida.

CÓMO SE JUEGA
Cada uno entra desde su móvil — compartid el código de la sala y a jugar.

De 4 a 24 jugadores. Sin narrador, sin cartas perdidas, sin discusiones
sobre las reglas.
```

#### İspanyolca (Latin Amerika) — es-419

```
Bite Club — Hombres Lobo
```
```
Alguien entre ustedes bebe sangre. Tomen el celular y descubran quién miente.
```
```
Bite Club es un juego de deducción social para jugar con amigos
alrededor de una mesa. Si alguna vez jugaron Hombres Lobo o Mafia, ya lo
conocen — solo que esta vez no hay cartas que se pierdan y nadie tiene
que quedarse afuera haciendo de narrador.

Cada uno juega desde su propio celular. Comparten el código de la sala y
el juego reparte los roles, dirige las noches y les dice cuándo hablar.
Ustedes solo juegan.

NOCHE
Los vampiros eligen víctima. El médico protege a alguien. La vidente lee
la identidad de un jugador. Todos cierran los ojos — el celular guarda
los secretos.

DÍA
La plaza del pueblo se llena. Acusen, defiéndanse, mientan. Y después la
votación: ¿a quién cuelgan?

11 ROLES
Aldeano, Vidente, Médico, Detective, Hechicero, Cazador, Vampiro, Señor
Vampiro, Brujo de Sangre, Vampiro de la Niebla y Ladrón. Cada rol tiene
su jugada nocturna, y el anfitrión decide qué roles entran en la partida.

CÓMO SE JUEGA
Cada uno entra desde su celular — comparten el código de la sala y a
jugar.

De 4 a 24 jugadores. Sin narrador, sin cartas perdidas, sin discusiones
sobre las reglas.
```

#### Portekizce (Brezilya) — pt-BR

```
Bite Club — Lobisomem
```
```
Alguém entre vocês bebe sangue. Peguem o celular e descubram quem mente.
```
```
Bite Club é um jogo de dedução social para jogar com amigos em volta da
mesa. Se vocês já jogaram Lobisomem ou Máfia, vão se sentir em casa —
só que desta vez não tem carta para perder e ninguém precisa ficar de
fora como narrador.

Cada um joga do próprio celular. Vocês compartilham o código da sala e o
jogo distribui os papéis, conduz as noites e avisa quando é hora de
falar. Vocês só jogam.

NOITE
Os vampiros escolhem a vítima. O médico protege alguém. A vidente lê a
identidade de um jogador. Todo mundo fecha os olhos — o celular guarda
os segredos.

DIA
A praça da vila se enche. Acusem, se defendam, blefem. Depois a votação:
quem vai para a forca?

11 PAPÉIS
Aldeão, Vidente, Médico, Detetive, Feiticeiro, Caçador, Vampiro, Senhor
Vampiro, Bruxo de Sangue, Vampiro da Névoa e Ladrão. Cada papel tem a
sua jogada noturna, e o anfitrião escolhe quais papéis entram na
partida.

COMO JOGAR
Cada um entra pelo próprio celular — compartilhem o código da sala e
comecem.

De 4 a 24 jogadores. Sem narrador, sem cartas perdidas, sem discussão
sobre as regras.
```

#### Portekizce (Portekiz) — pt-PT

```
Bite Club — Lobisomem
```
```
Alguém entre vocês bebe sangue. Peguem no telemóvel e descubram quem mente.
```
```
Bite Club é um jogo de dedução social para jogar com amigos à volta da
mesa. Se já jogaram Lobisomem ou Máfia, vão sentir-se em casa — só que
desta vez não há cartas para perder e ninguém tem de ficar de fora a
fazer de narrador.

Cada um joga no seu próprio telemóvel. Partilham o código da sala e o
jogo distribui os papéis, conduz as noites e avisa quando é altura de
falar. Vocês só jogam.

NOITE
Os vampiros escolhem a vítima. O médico protege alguém. A vidente lê a
identidade de um jogador. Toda a gente fecha os olhos — o telemóvel
guarda os segredos.

DIA
A praça da aldeia enche-se. Acusem, defendam-se, finjam. Depois a
votação: quem vai para a forca?

11 PAPÉIS
Aldeão, Vidente, Médico, Detetive, Feiticeiro, Caçador, Vampiro, Senhor
Vampiro, Bruxo de Sangue, Vampiro da Névoa e Ladrão. Cada papel tem a
sua jogada noturna, e o anfitrião escolhe que papéis entram na partida.

COMO JOGAR
Cada um entra pelo seu telemóvel — partilhem o código da sala e comecem.

De 4 a 24 jogadores. Sem narrador, sem cartas perdidas, sem discussões
sobre as regras.
```

#### İtalyanca — it-IT

```
Bite Club — Lupo Mannaro
```
```
Uno di voi beve sangue. Prendete i telefoni e scoprite chi sta mentendo.
```
```
Bite Club è un gioco di deduzione sociale da fare con gli amici intorno
a un tavolo. Se avete giocato a Lupo Mannaro o a Mafia lo riconoscerete
subito — solo che stavolta non ci sono carte da perdere e nessuno deve
restare fuori a fare il narratore.

Ognuno gioca dal proprio telefono. Condividete il codice della stanza e
il gioco distribuisce i ruoli, gestisce le notti e vi dice quando
parlare. A voi resta solo giocare.

NOTTE
I vampiri scelgono la vittima. Il medico protegge qualcuno. La veggente
legge l'identità di un giocatore. Tutti chiudono gli occhi — il telefono
custodisce i segreti.

GIORNO
La piazza del villaggio si riempie. Accusate, difendetevi, bluffate. Poi
il voto: chi finisce impiccato?

11 RUOLI
Villico, Veggente, Medico, Detective, Mago, Cacciatore, Vampiro, Signore
dei Vampiri, Stregone del Sangue, Vampiro della Nebbia e Ladro. Ogni
ruolo ha la sua mossa notturna, e chi crea la partita decide quali ruoli
entrano in gioco.

COME SI GIOCA
Ognuno entra dal proprio telefono — condividete il codice e si parte.

Da 4 a 24 giocatori. Niente narratore, niente carte perse, niente
discussioni sulle regole.
```

#### Rusça — ru-RU

```
Bite Club — Мафия и вампиры
```
```
Кто-то из вас пьёт кровь. Возьмите телефоны и найдите того, кто лжёт.
```
```
Bite Club — игра на социальную дедукцию для компании за одним столом.
Если вы играли в «Мафию» или «Оборотня», всё будет знакомо — только
теперь не нужны карты и никому не придётся весь вечер быть ведущим.

Каждый играет со своего телефона. Поделитесь кодом комнаты: игра раздаст
роли, проведёт ночи и подскажет, когда говорить. Вам остаётся только
играть.

НОЧЬ
Вампиры выбирают жертву. Доктор кого-то защищает. Провидец узнаёт роль
одного из игроков. Все закрывают глаза — телефон хранит секреты.

ДЕНЬ
Площадь наполняется. Обвиняйте, защищайтесь, блефуйте. Потом
голосование: кого повесим?

11 РОЛЕЙ
Житель, Провидец, Доктор, Детектив, Волшебник, Охотник, Вампир,
Повелитель вампиров, Кровавый маг, Туманный вампир и Вор. У каждой роли
свой ночной ход, а создатель комнаты решает, какие роли будут в игре.

КАК ИГРАТЬ
Каждый заходит со своего телефона — поделитесь кодом комнаты и
начинайте.

От 4 до 24 игроков. Без ведущего, без потерянных карт, без споров о
правилах.
```

#### Japonca — ja-JP

```
Bite Club — 人狼とヴァンパイア
```
```
この中の誰かが血を吸っています。スマホを持って、嘘をついているのは誰か見つけ出しましょう。
```
```
Bite Clubは、テーブルを囲んで友だちと遊ぶ正体隠匿ゲームです。人狼やマフィアを
知っているなら、すぐに馴染めます。ただし今回はなくす札もなければ、誰かが
ゲームマスターとして見ているだけ、ということもありません。

全員が自分のスマホから参加します。ルームコードを共有すれば、ゲームが役職を
配り、夜を進行し、誰がいつ話すかを教えてくれます。あなたたちはただ遊ぶだけ。

夜
ヴァンパイアが獲物を選びます。医者が誰かを守ります。占い師が一人の正体を
読みます。全員が目を閉じ、秘密はスマホが預かります。

昼
広場に人が集まります。疑い、弁明し、ブラフをかける。そして投票 ——
吊るされるのは誰か。

11の役職
村人、占い師、医者、探偵、魔術師、狩人、ヴァンパイア、ヴァンパイアロード、
血の魔導士、霧のヴァンパイア、盗賊。役職ごとに夜の行動があり、どの役職を
使うかは部屋を作った人が決めます。

遊び方
全員が自分のスマホから参加 —— ルームコードを共有するだけ。

4人から24人まで。進行役は不要、カードは失くならず、ルールで揉めることも
ありません。
```

#### Korece — ko-KR

```
Bite Club — 마피아 뱀파이어
```
```
여러분 중 누군가는 피를 마십니다. 휴대폰을 들고 누가 거짓말하는지 찾아내세요.
```
```
Bite Club은 친구들과 테이블에 둘러앉아 즐기는 사회적 추리 게임입니다.
마피아나 늑대인간을 해봤다면 금방 익숙해집니다. 다만 이번에는 잃어버릴
카드도 없고, 누군가 혼자 사회자로 앉아 있을 필요도 없습니다.

모두 자기 휴대폰으로 참여합니다. 방 코드를 공유하면 게임이 역할을 나누고,
밤을 진행하고, 누가 언제 말할지 알려줍니다. 여러분은 그냥 플레이하면 됩니다.

밤
뱀파이어가 희생자를 고릅니다. 의사가 누군가를 지킵니다. 예언자가 한 사람의
정체를 읽습니다. 모두 눈을 감고, 비밀은 휴대폰이 지킵니다.

낮
광장이 들어찹니다. 의심하고, 변호하고, 속이세요. 그리고 투표 — 누구를
매달까요?

11가지 역할
마을 사람, 예언자, 의사, 탐정, 마법사, 사냥꾼, 뱀파이어, 뱀파이어 군주,
피의 마술사, 안개 뱀파이어, 도둑. 역할마다 밤 행동이 있고, 어떤 역할을
쓸지는 방을 만든 사람이 정합니다.

플레이 방법
모두 자기 휴대폰으로 참여 — 방 코드를 공유하면 끝입니다.

4명부터 24명까지. 사회자도, 잃어버린 카드도, 규칙 다툼도 없습니다.
```
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

---

## 13. Uygulama içi ürün: `premium_roles`

| Alan | Değer |
|---|---|
| Ürün kimliği | `premium_roles` (değiştirilemez) |
| Ad | Tüm Roller |
| Tür | Yönetilen ürün (tek seferlik, tüketilmez) |
| Simge | `store/premium-icon-1080.png` |
| Vergi kategorisi | Dijital uygulama satışları |
| Fiyat | Global $3,99 · Türkiye elle ₺149,99 |

Açıklama (176/200):

```
Büyücü, Kan Büyücüsü ve Sisler Vampiri açılır. Sonradan eklenen roller de kalıcı olarak senin olur. Odayı sen kurduğunda masadaki herkes oynar; kimsenin ayrıca alması gerekmez.
```

**Bu açıklama iki taahhüt içeriyor:**

1. **Gelecekteki premium roller dahil.** Yeni bir rol `premium` katmanına
   eklendiğinde mevcut alıcılara açılır, ayrı satılamaz. (`unlocks.ts`
   içinde de not düşüldü.)
2. **Masa geneli.** Odayı kuran aldıysa masadaki herkes o rollerle oynar.
   Motor bunu zaten böyle yapıyor: rol havuzunu kurucunun eli belirliyor
   (`HostController` yapıcısı → `currentUnlockedRoles()`).

Ürün simgesinde **metin, tanıtım ve marka yasak** — Play kuralı. Simge
yalnız üç rolün çiziminden oluşuyor.

## 14. AdMob kimlikleri ve demo/canlı kuralı

Hesap: `pub-3566083608754052` (AdSense ödeme profiliyle aynı numara).

| Ne | Kimlik | Nerede duruyor |
|---|---|---|
| Uygulama kimliği | `ca-app-pub-3566083608754052~3903512524` | `AndroidManifest.xml`, kalıcı |
| Geçiş — "Oyun sonu geçiş" | `ca-app-pub-3566083608754052/4127225453` | `.env.production.local` → `VITE_ADMOB_INTERSTITIAL` |
| Ödüllü — "Bir oyunluk premium" | `ca-app-pub-3566083608754052/1632572404` | `.env.production.local` → `VITE_ADMOB_REWARDED` |

**Uygulama kimliği her derlemede manifest'te duruyor, değiştirilmiyor.**
Tehlikesiz: o kimlik yalnız uygulamayı tanıtıyor, hangi reklamın geleceğini
birim kimlikleri belirliyor. Sürüme göre elle değiştirilseydi, yayın günü
unutulacak bir adım daha olurdu.

**Birim kimlikleri kapalı testte DEMO kalıyor.** İki sebep:

1. Kendi reklamına tıklamak — test niyetiyle bile — AdMob'un "geçersiz
   etkinlik" tanımına giriyor ve hesap kapatmaya kadar gidebiliyor. 12
   test kullanıcısının cihazını tek tek test cihazı olarak kaydetmek
   pratik değil.
2. Uygulama henüz Play listesine bağlı ve AdMob tarafından onaylı
   olmadığı için doluluk zaten sıfıra yakın. Canlı kimlikle test etmek
   "reklam gelmedi" ile "kod bozuk"u ayırt edilemez hale getirirdi.
   Demo birimleri aynı kod yolunu (`prepareInterstitial` /
   `showRewardVideoAd`) sonuna kadar çalıştırıyor.

### Üretim sürümünü çıkarırken

Kapalı test sürümünü üretime **yükseltme**. Play'in olağan akışı bu ama
bizde yanlış: o paketin içinde demo kimlikler var, yayındaki oyun test
reklamı gösterir ve hiçbir yerde hata vermez.

Doğrusu: `.env.production.local`'a iki satırı yaz, versionCode'u artır, yeniden
derle. `npm run check` çıktısının son satırı **`reklamlar: CANLI`** demeli.
`DEMO` ya da `KARIŞIK` diyorsa paketi yükleme.

### Yayından sonra

AdMob → uygulama ayarları → mağaza ekle → paket adını ara
(`com.lampwickgames.biteclub`) → bağla. İnceleme ~2 gün. App ID değişmiyor,
yeni sürüm gerekmiyor. Bağlanana kadar doluluk düşük olacak, bu normal.

### Kimlikler neden `.env.production.local`'da

Depo public ve `.env.production` **takip ediliyor** — oraya yazılan her
şey GitHub'da görünür. `.env.production.local` ise `.gitignore`'daki
`.env.*` kuralına takılıyor, Vite de onu `.env.production`'ın üstünde
okuyor.

Reklam birimi kimlikleri sır değil: pakete gömülüyorlar, ağ isteğinde
görünüyorlar, `app-ads.txt` zaten yayıncı kimliğini açıkça ilan ediyor.
Ama başkası bu kimlikleri kendi uygulamasında kullanırsa **trafik bizim
hesabımıza yazılır** ve geçersiz etkinlik cezasını biz yeriz. Depoda
tutmanın hiçbir faydası olmadığı için tutmuyoruz.

`.env.production` yapısal ayarı taşımaya devam ediyor (`VITE_NET_MODE`,
`VITE_PUBLIC_URL`) ve **takipli kalmalı**: `VITE_PUBLIC_URL` kaybolursa
uygulama aktarıcıyı bulamaz ve sessizce P2P'ye düşer — 16 Eylül'de
Android'in webe bağlanamamasının sebebi buydu.

### AB rızası (UMP/CMP) — ülke açılımının ön şartı

Google'ın AB Kullanıcı Rızası Politikası: **AEA, Birleşik Krallık ve
İsviçre'de** reklam gösteren her uygulamada Google onaylı bir rıza ekranı
(CMP) olmak zorunda. Yoksa AdMob o ülkelerde **sessizce reklam vermeyi
keser** — hata yok, log yok, sadece doluluk sıfır — ve GDPR tarafında da
dayanağımız olmaz.

Bu yüzden ülke açılımı 2.2'ye bağlandı: önce rıza akışı, sonra tüm ülkeler.

**Kodda** (`src/monetization/adGate.ts`):

- `onayAl()` → `AdMob.requestConsentInfo()`, gerekiyorsa
  `AdMob.showConsentForm()`. Sıra: **UMP → ATT → initialize**. Google'ın
  sıralaması bu; ters sırada kullanıcı iki kutuyu bağlamsız görüyor.
- `canRequestAds: false` (kullanıcı reddetti) → reklam isteği hiç
  atılmıyor; oyun aynen akıyor.
- `privacyOptionsRequirementStatus: REQUIRED` → Ayarlar'da "Gizlilik
  seçenekleri" düğmesi beliriyor (`PrivacyOptions.tsx`), AdMob'un hazır
  formunu açıyor. AB dışında düğme hiç görünmüyor.
- UMP katmanı patlarsa reklamlar AB dışında aynen çalışıyor.

Testler: `adGate.test.ts` → "AB kullanıcı rızası (UMP)" bloğu (8 test).
`onayAl` çağrısını silince 9 test düşüyor — kontrol edildi.

**AdMob konsolunda yapılması gereken (kodla gelmiyor):**

1. AdMob → **Gizlilik ve mesajlaşma** → **AB kullanıcı rızası**
2. **Mesaj oluştur** → uygulamayı seç (Bite Club)
3. Reklam ortakları: Google'ın önerdiği liste yeterli
4. Dil: en azından İngilizce + mağaza girişi açtığımız diller
5. **Yayınla** — yayınlanmadan form cihazda çıkmaz,
   `isConsentFormAvailable: false` döner ve kod sessizce geçer

Aynı yerden "ABD eyalet düzenlemeleri" mesajı da açılabilir; şart değil,
ama CCPA tarafı için ileride bakılacak.

**Test etmek için:** gerçek AB cihazı gerekmiyor —
`requestConsentInfo({ debugGeography: AdmobConsentDebugGeography.EEA,
testDeviceIdentifiers: ['...'] })`. Üretim kodunda bilerek yok; denemek
için geçici olarak eklenip geri alınmalı.

## 15. İlk yayın kararları (16 Eylül 2026)

| Karar | Değer | Gerekçe |
|---|---|---|
| Kanal | **Doğrudan üretim** | Açık test atlandı: tek öğreteceği şey platformlar arası bağlantıydı ve o gerçek cihazda doğrulandı. Bir inceleme turu kazanıldı. |
| Ülke | **Yalnız Türkiye** | Reklam geliri ve satın alma davranışı önce dar bir kitlede gerçek veriyle görülecek. Bir hata çıkarsa 80 ülkeye değil bir ülkeye yayılır. Oyun tr+en hazır, genişletmek sonradan tek ayar. |
| Sunum | **Aşamalı, %20'den başlayarak** | Android vitals ve yorumlar birkaç gün izlenip %50, sonra %100. |
| Sürüm | 2.0 (versionCode 14) | Android'in aktarıcıya geçtiği, reklamların canlıya çıktığı, premium'un açıldığı sürüm. |

Açık test taslağı (1.10) silindi; üretime doğrudan çıkıldığı için
kanalda karışıklık yaratıyordu.

**Genişletmeden önce bakılacaklar:** AdMob'un mağaza bağlantısı onaylandı
mı (doluluk oranı), ilk satın almalar geldi mi, Android vitals temiz mi.

---

## 16. Sürüm notları — 2.1 (versionCode 16)

Play'de sürüm notu dil başına 500 karakter. Boş bırakılan dil varsayılana
(Türkçe) düşer; o yüzden mağaza girişi olan her dile yazıldı.

2.0 (15) ile 2.1 (16) arasındaki kullanıcıya görünen fark: on dil, yeni
uygulama simgesi, Android ↔ web bağlantı düzeltmesi.

```tr-TR
• Oyun artık on dilde: Türkçe, İngilizce, Almanca, Fransızca, İspanyolca, Portekizce, İtalyanca, Rusça, Japonca, Korece. Ayarlar'dan değiştirilir.
• Android ile web arasındaki bağlantı sorunu giderildi.
• Yeni uygulama simgesi.
```

```en-US
• The game now speaks ten languages: Turkish, English, German, French, Spanish, Portuguese, Italian, Russian, Japanese and Korean. Switch in Settings.
• Fixed the connection problem between the Android app and the web version.
• New app icon.
```

```de-DE
• Das Spiel spricht jetzt zehn Sprachen: Türkisch, Englisch, Deutsch, Französisch, Spanisch, Portugiesisch, Italienisch, Russisch, Japanisch und Koreanisch. Umschalten in den Einstellungen.
• Verbindungsproblem zwischen App und Webversion behoben.
• Neues App-Symbol.
```

```fr-FR
• Le jeu parle maintenant dix langues : turc, anglais, allemand, français, espagnol, portugais, italien, russe, japonais et coréen. À changer dans les paramètres.
• Correction du problème de connexion entre l'application et la version web.
• Nouvelle icône.
```

```es-ES
• El juego ya habla diez idiomas: turco, inglés, alemán, francés, español, portugués, italiano, ruso, japonés y coreano. Se cambia en Ajustes.
• Corregido el problema de conexión entre la aplicación y la versión web.
• Nuevo icono.
```

```es-419
• El juego ya habla diez idiomas: turco, inglés, alemán, francés, español, portugués, italiano, ruso, japonés y coreano. Se cambia en Configuración.
• Corregido el problema de conexión entre la aplicación y la versión web.
• Nuevo ícono.
```

```pt-BR
• O jogo agora fala dez idiomas: turco, inglês, alemão, francês, espanhol, português, italiano, russo, japonês e coreano. Troque em Configurações.
• Corrigido o problema de conexão entre o aplicativo e a versão web.
• Novo ícone.
```

```pt-PT
• O jogo fala agora dez idiomas: turco, inglês, alemão, francês, espanhol, português, italiano, russo, japonês e coreano. Mude nas Definições.
• Corrigido o problema de ligação entre a aplicação e a versão web.
• Novo ícone.
```

```it-IT
• Il gioco ora parla dieci lingue: turco, inglese, tedesco, francese, spagnolo, portoghese, italiano, russo, giapponese e coreano. Si cambia dalle impostazioni.
• Risolto il problema di connessione tra l'app e la versione web.
• Nuova icona.
```

```ru-RU
• Игра теперь на десяти языках: турецкий, английский, немецкий, французский, испанский, португальский, итальянский, русский, японский и корейский. Меняется в настройках.
• Исправлена проблема соединения между приложением и веб-версией.
• Новая иконка.
```

```ja-JP
・10言語に対応しました：トルコ語、英語、ドイツ語、フランス語、スペイン語、ポルトガル語、イタリア語、ロシア語、日本語、韓国語。設定から切り替えられます。
・アプリとWeb版のあいだの接続不具合を修正しました。
・アプリアイコンを新しくしました。
```

```ko-KR
• 열 가지 언어를 지원합니다: 터키어, 영어, 독일어, 프랑스어, 스페인어, 포르투갈어, 이탈리아어, 러시아어, 일본어, 한국어. 설정에서 바꿀 수 있습니다.
• 앱과 웹 버전 사이의 연결 문제를 고쳤습니다.
• 새 앱 아이콘.
```
