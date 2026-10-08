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
