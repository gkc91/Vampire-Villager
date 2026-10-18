# App Review — Guideline 2.1 "Information Needed" (8 Ekim 2026)

iOS 2.2 (derleme 2) incelemesinde Apple ret değil **bilgi talebi** gönderdi:
yeni geliştirici hesaplarına standart soru listesi. İstedikleri:

1. Gerçek bir iPhone'da, güncel iOS'ta çekilmiş **ekran kaydı** — uygulamanın
   açılışından başlamalı, normal akışı ve **ücretli içeriğe erişimi**
   göstermeli. (Aşağıda çekim listesi.)
2–7. Yazılı cevaplar (aşağıda, İngilizce, olduğu gibi yapıştırılacak).

Apple aynı bilgilerin **App Review Information → Notes** alanına da
konmasını istiyor; sonraki gönderimlerde orada dursun.

---

## Ekran kaydı — çekim listesi (~2–3 dk)

Telefon dili **İngilizce** olsun (inceleyen İngilizce görecek). iOS Ayarlar →
Denetim Merkezi'ne "Ekran Kaydı" ekli değilse ekle.

1. Kaydı başlat, **ana ekrandan** Bite Club'ı aç (soğuk açılış: önce
   uygulamayı arka plandan kapat).
2. İzin pencereleri çıkarsa (ATT, rıza) göster, cevapla.
3. Bir isim yaz → **Create Room**. Oda kodu ve **Share** görünsün.
4. **Add bot** ×4 (5 oyuncu olur).
5. Aşağı kaydır → **Locked roles** kartı → **Unlock all roles** → App Store
   satın alma penceresi → onayla. TestFlight'ta satın alma **sanal
   (sandbox)**, para çekilmez. Rollerin kilidinin açıldığı görünsün.
6. Sağ üst **⚙️ Ayarlar** → **Restore purchases** düğmesini göster, kapat.
7. **Start Game** → **Show my role** → **Got it, hide**.
8. Gece: rolün bir hamle istiyorsa seç → **Confirm my choice**.
9. Gündüz: **End discussion** → oylama → bir oy ver.
10. Oyun bitene kadar ya da bir tur daha oyna; sonuç ekranını göster, kaydı
    bitir.

Hesap, giriş, kullanıcı içeriği **yok** — kayıtta göstermeye gerek yok; cevapta
açıkça yazıyor.

---

## Cevap metni (App Review'a ve Notes'a)

```
Thank you for the review. Below is the information you requested. A screen
recording made on a physical iPhone is attached.

1. SCREEN RECORDING
Attached. It starts by launching the app from the Home Screen and shows
creating a room, adding players, purchasing the in-app purchase (sandbox),
Restore purchases, and a full round of play. The app has no account
registration, no login and no user-generated content, so there are no
account-deletion or content-reporting flows to show.

2. PURPOSE AND TARGET AUDIENCE
Bite Club is a social deduction party game in the style of Werewolf / Mafia,
for groups of 4 to 24 people playing together in the same room. Each player
uses their own phone. The app deals secret roles, runs the night phases,
keeps each player's private notes, times the day discussion and counts the
votes. It replaces the physical cards and the human moderator these games
normally need, so everyone can play and nobody has to sit out. The audience
is friends, families and party groups (age rating 9+).

3. HOW TO USE THE MAIN FEATURES
No account, login or sample files are needed.
- Open the app, type any name and tap "Create Room". A 6-character room code
  appears; other players tap "Join Room" and enter the code (or open the
  shared link).
- To test with one device: tap "Add bot" three or more times. Bots run on
  the host device and play automatically.
- Tap "Start Game". Each player taps "Show my role", then "Got it, hide".
- At night, players with a night ability choose a target and tap
  "Confirm my choice". During the day the group talks; the host can tap
  "End discussion", then everyone votes. The game ends when one team wins.
- The interface follows the device language (10 languages, including
  English).

4. EXTERNAL SERVICES
- Cloudflare Workers / Durable Objects: relays game messages between the
  devices in the same room. No accounts, and no personal data is stored.
- Google AdMob: interstitial and optional rewarded ads. Google User
  Messaging Platform shows the consent form in the EEA, the UK and
  Switzerland; App Tracking Transparency is requested before ads load.
- Apple In-App Purchase (StoreKit): the single non-consumable purchase.
- Public STUN servers (Google, Cloudflare) are used only if a direct
  peer-to-peer connection is needed.
No AI services, data providers or authentication services are used.

5. REGIONAL DIFFERENCES
Gameplay and content are identical in all regions. The only differences are
the interface language (it follows the device setting) and, in the EEA, the
UK and Switzerland, the advertising consent form required there.

6. REGULATED INDUSTRY / THIRD-PARTY MATERIAL
Not applicable. The app is a game in no regulated industry. All artwork and
music were created for this game by the developer; sound effects are used
under the Pixabay Content License. No protected third-party material is
included.

7. IN-APP PURCHASE
One non-consumable product, "All Roles" (premium_roles). It permanently
unlocks three extra roles: Wizard, Blood Sorcerer and Mist Vampire. When the
buyer hosts a room, everyone at that table plays with those roles; other
players do not need to buy anything.
How to reach it: Create Room, scroll down to the "Locked roles" card, tap
"Unlock all roles". "Restore purchases" is in Settings (the gear icon,
top right). The second button on the same card, "Watch an ad, unlock for
this game", is a rewarded ad that unlocks the roles for one game only; it is
not a purchase.
```

---

## Gönderildi — 8 Ekim 2026, 10:24

- Cevap metni yukarıdaki gibi (paragraflar düz satıra çevrilerek) App
  Review'a yazıldı, Hilal'in iPhone'unda çekilen kayıt (114 sn) eklendi.
- Aynı metin, giriş paragrafı çıkarılıp "Attached to our App Review reply of
  Oct 8, 2026" diye uyarlanarak **App Review Information → Notes**'a kondu
  (3.370 karakter, sunucudan doğrulandı).
- Kayıtta: ana ekrandan açılış, oda kurma, 3 bot, satın alma tamamlandı
  ("Satın alma işleminiz başarılı"), roller açıldı, Ayarlar → Restore
  purchases ("Your premium access has been restored."), iki tur oyun.
- **YANLIŞTI — cevap tek başına yetmiyor.** Gönderi bir gün boyunca
  "Unresolved Issues", sürüm "Rejected" kaldı. "Resubmit to App Review"
  pasifti çünkü reddedilen sürüm gönderiye geri bağlanmamıştı.

**Doğru akış (9 Ekim 2026'da çalıştı):**
1. Cevabı yaz (Reply to App Review), Notes'u güncelle.
2. **Sürüm sayfasında "Update Review"** — reddedilen sürümü gönderiye geri
   bağlıyor; iki öğe de `READY_FOR_REVIEW` oluyor.
3. Gönderi sayfasında açılan **"Resubmit to App Review"**.
9 Ekim 09:30'da yeniden gönderildi; gönderi, sürüm ve IAP `WAITING_FOR_REVIEW`.

(IAP'ın API'de `MISSING_METADATA` görünmesi engel değil: v2 API taslak
öğeyi böyle etiketliyor, arayüz "Ready for Review" diyor.)

**Kayıt notları — sonraki sefer için:**
- WhatsApp videoyu 384x848'e küçültüyor; "Belge" olarak gönderilse bile
  kaynak olarak WhatsApp'taki kopya seçilirse aynı kalıyor. Orijinal için
  Fotoğraflar'dan AirDrop / Mail.
- İlk denemede satın alma Apple ID parolası kabul edilmediği için yarım
  kaldı (Apple şifre sıfırlama ekranına geçti); uygulama doğru şekilde
  "That did not go through" gösterdi.
- TestFlight'ta düğmede "$3.99", satın alma penceresinde "149,99 TL"
  görünüyor: StoreKit onaysız üründe taban fiyatı döndürüyor, uygulama
  hatası değil.
- Hilal App Store Connect'e "Marketing" rolüyle eklendi (ücretsiz Apple
  ID yeterli), "test" iç TestFlight grubunda.

---

# Guideline 2.1(b) — "products failed to load" (17 Ekim 2026)

İkinci ret. Metin:

> The In-App Purchase products in the app exhibited one or more bugs which
> create a poor user experience. Specifically, when we attempted to purchase
> in-app products, the products failed to load.
> (iPhone 17 Pro Max, iOS 27.0, sürüm 2.2 (3))

## Sebep: IAP gönderiye eklenmişti ama İNCELEMEYE GİRMEMİŞTİ

Gönderi sayfasındaki tablo tek başına cevabı veriyor:

| Öğe | Tür | İnceleme durumu |
|---|---|---|
| Tüm Roller | In-App Purchase | **Ready for Review** |
| iOS App 2.2 | App Version | Rejected |

Sürüm incelendi (bu yüzden "Rejected"), ürün **hiç incelenmedi**. Ürün
kaydının kendisi de `stateGroup: DRAFT`, `isAppStoreReviewInProgress: false`.

StoreKit taslak ürünü **sandbox'ta da sunmuyor**. İncelemeci uygulamayı
açtı, `Product.products(for:)` boş döndü, düğmede fiyat çıkmadı, basınca
"That did not go through" gördü. Apple'ın kendi yönlendirmesi de bunu
söylüyordu: "Review the product configurations, complete any missing
information, and test them in the sandbox."

**Kod tarafında hata yoktu** ve arama şu sırayla elendi:

- Paid Apps sözleşmesi aktif (13 Eki 2026 – 6 Eki 2027), banka ve vergi
  formları tamam → Apple'ın ilk tahmini değil.
- Ürün yapılandırması eksiksiz: iki yerelleştirme, fiyat çizelgesi (taban
  ABD), tüm ülkeler, 1242x2208 inceleme karesi, inceleme notu.
- `@capgo/native-purchases@8.7.0` **her iki derlemede de** pakette
  (`cap sync` çıktısı, derleme 2 ve 3 birebir aynı).
- `package-lock.json` 16 Eylül'den beri değişmemiş, CI `npm ci` kullanıyor
  → sürüm kayması yok.

Kalan tek fark ASC'deydi: 8 Ekim'de Hilal'in TestFlight'ında fiyat
görünüyordu, çünkü o gün ürün `WAITING_FOR_REVIEW`'deydi (bu belgedeki
9 Ekim notu da öyle diyor). 13 Ekim'deki yeniden gönderimde ürün
gönderiye geri bağlanmadı, `Ready for Review`'de kaldı ve 17 Ekim
incelemesine girmedi.

## Yukarıdaki parantezi düzeltiyor

9 Ekim notundaki "IAP'ın API'de `MISSING_METADATA` görünmesi engel değil"
cümlesi **yanlış**. O gün engel değildi çünkü ürün ayrıca gönderide
`WAITING_FOR_REVIEW` idi. Bakılacak alan API'deki `state` değil,
**gönderi sayfasındaki satırın inceleme durumu**:

- `Waiting for Review` / `In Review` → sandbox ürünü sunar.
- `Ready for Review` → ürün sahnede değil, sandbox boş döner.

## Yeniden gönderirken

Reddedilen bir sürümü yeniden gönderirken **her iki satırı da** doğrula.
"Update Review" yalnız sürümü geri bağlıyor; IAP satırı
`Ready for Review`'de kalırsa ürün yine incelemeye girmez. Kalıyorsa
ürünü gönderiden **Delete** edip ürün sayfasındaki **"Add for Review"**
ile yeniden ekle.

Gönderimden sonra son kontrol — ikisi de `WAITING_FOR_REVIEW` olmalı:

```
/iris/v2/inAppPurchases/<iap-id>  → attributes.isAppStoreReviewInProgress
Gönderi sayfası                   → IAP satırının "REVIEW STATUS" hücresi
```

## Yeniden gönderildi — 18 Ekim 2026, 14:31

1. Derleme 4 alındı (CI run 39122566015). Satın alma kodu derleme 3 ile
   birebir aynı; fazladan **derin link düzeltmesi** var (iOS'ta eksikti).
2. Sürüm sayfasında derleme 3 kaldırıldı, **4** seçildi, kaydedildi.
   Kaydetme sürümü gönderiye kendiliğinden geri bağladı — bu sefer ayrıca
   "Update Review" gerekmedi.
3. App Review'a cevap yazıldı (sebep: ürün incelemeye girmemişti).
4. **Resubmit to App Review.**

Gönderimden sonra doğrulandı:

| Öğe | İnceleme durumu |
|---|---|
| Tüm Roller | **Waiting for Review** |
| iOS App 2.2 (4) | **Waiting for Review** |

Ürün kaydı: `state: WAITING_FOR_REVIEW`, `stateGroup: IN_REVIEW`,
`isAppStoreReviewInProgress: true` — 8 Ekim'de TestFlight'ta fiyatın
göründüğü durumun aynısı. Bir sonraki ret/onay bu satırlarla karşılaştırılsın.
