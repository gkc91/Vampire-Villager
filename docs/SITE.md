# Stüdyo Sitesi — lampwickgames.com

Tek sayfalık stüdyo sitesi. Klasör düzeni:

```
site/
  wrangler.jsonc   ← yayın ayarı (SUNULMAZ)
  public/
    index.html     ← sitenin kendisi
```

Yapılandırma dosyası bilerek `public/` dışında: sunulan klasörün içinde
olursa `/wrangler.jsonc` adresinden herkese açık okunuyor (bir kez oldu).
 Derleme adımı yok; düz
HTML, tek dosya. Oyunun kendisiyle karıştırılmasın:

| Adres | Ne servis eder | Nereden |
|---|---|---|
| `lampwickgames.com` | Stüdyo sitesi | `lampwick-site` Worker ← `site/public/` |
| `biteclub.lampwickgames.com` | Oyun + `/nasil-oynanir` + `/privacy` | `vampire-villager` Worker ← `dist/` |

## Hangi içerik hangi sitede

**Stüdyo sayfası oyun ayrıntısı taşımaz.** Kurallar, roller, SSS ve
gizlilik politikası oyunun kendi sitesinde durur; stüdyo sayfasında
yalnız oyun kartı (kapak, tek cümlelik tanıtım, düğmeler) ve stüdyo
metni var. İkinci oyun geldiğinde stüdyo sayfası oyun listesi olarak
kalacak, Bite Club'ın kurallarıyla dolu olmayacak.

Nasıl oynanır bölümleri önce yanlışlıkla stüdyo sayfasına konmuştu;
`public/nasil-oynanir.html` olarak oyunun sitesine taşındı. Stüdyo
sayfasındaki oyun kartında oraya giden bir düğme var.

`public/*.html` dosyaları Vite tarafından `dist/` köküne kopyalanır ve
Worker uzantısız adresle servis eder (`/privacy`, `/nasil-oynanir`).
**Vite dev sunucusunda uzantısız yol çalışmaz** — orada SPA yedeği
devreye girip oyunu açar; geliştirirken `/nasil-oynanir.html` kullan.

Rol görselleri kopyalanmaz, oyunun canlı adresinden çekilir. Tek kaynak
kalır: bir rol kartı güncellendiğinde site de kendiliğinden güncellenir.

---

## Yayın: Worker olarak (Pages değil)

**Cloudflare 2026'da Pages'i arayüzden kaldırdı.** Panelde "Pages" sekmesi
görünmüyorsa sorun sende değil: yeni projeler için önerilen yol
**Workers + statik dosyalar**. Oyunun Worker'ı da zaten böyle çalışıyor.

Sitenin kendi yapılandırması `site/wrangler.jsonc` dosyasında duruyor:
kod yok, yalnız statik dosya sunuyor.

### GitHub'a bağlayarak (otomatik yayın)

1. Cloudflare → **Workers & Pages** → **Create application**.
2. **Import a repository** / **Connect to Git** seçeneğini seç, GitHub'ı
   bağla ve **Vampire-Villager** deposunu seç.
3. Derleme ayarları — burası kritik:

   | Alan | Değer |
   |---|---|
   | Project / Worker name | `lampwick-site` |
   | **Root directory** | **`site`** |
   | Build command | **boş bırak** |
   | Deploy command | `npx wrangler deploy` |
   | Production branch | `main` |

   > **Root directory'yi `site` yapmak şart.** Boş bırakırsan Cloudflare
   > depo kökündeki `wrangler.jsonc`'yi bulur ve stüdyo sitesi yerine
   > OYUNU yayınlar — üstelik aynı Worker adına.

4. Kaydet ve yayınla. Site `lampwick-site.<hesap>.workers.dev` adresinde
   çıkar.

### Alan adını bağlama

5. `lampwick-site` Worker'ı → **Settings** → **Domains & Routes** →
   **Add** → **Custom domain** → `lampwickgames.com`.
6. Alan adı zaten Cloudflare'de olduğu için DNS kaydı kendiliğinden
   eklenir.

### Elle yükleme (hızlı yol)

GitHub bağlamak istemezsen: **Create application** → statik dosya
yükleme seçeneğinde `site` klasörünü sürükle. İki dakika sürer ama her
değişiklikte tekrar yüklemen gerekir.

## Çift dil (tr / en)

Sayfa QR'ın indiği yer olduğu için **varsayılan Türkçe**. Metinler HTML'de
iki kez duruyor, `data-tr` / `data-en` işaretiyle; aktif olmayanı CSS
gizliyor. Dil seçimi `<head>` içindeki senkron script'te yapılıyor —
boyamadan önce olmalı, yoksa Türkçe bir an görünüp İngilizceye atlıyor.

Tarayıcı dili Türkçe değilse İngilizceye düşer; başlıktaki TR/EN düğmesi
seçimi `localStorage`'a yazar. JavaScript kapalıysa Türkçe kalır.

Yeni metin eklerken **iki dili birlikte ekle** — oyundaki i18n kuralının
aynısı burada da geçerli.

## Nasıl oynanır bölümü

Sayfada dört bölüm var: oyunun ne olduğu, roller, bir turun akışı, SSS.
Hedef kitle oyunu hiç duymamış kişi (aile büyükleri) — o yüzden dil sade,
"sosyal çıkarım" gibi terim yok.

**Rol listesi elle yazılmadı.** `src/i18n/locales/*/roles.json` içindeki
`name` ve `short` alanlarından üretildi; takım eşlemesi de
`src/game/roles/*.ts` içindeki `team:` alanından okundu. Rol metni
oyunda değişirse buradaki de elle güncellenmeli — iki kaynak var, tek
kaynak yok. Yeni rol eklenirse aynı yerden bakıp ekle.

### Ekran görüntüleri

`site/public/assets/how/` altında 5 webp, adım adım eşleşiyor: lobi, rol
kartı, gece, gündüz, sonuç. Oylama adımının görüntüsü yok (mağaza setinde
oylama karesi çıkmamıştı) — çekilirse `6-oylama.webp` diye ekleyip
`add_shots.py` mantığındaki listeye koymak yeterli.

Kaynak `store/screens/out/*.png` (1080x2122). Küçültme:

```bash
ffmpeg -i store/screens/out/04-gece.png -vf scale=520:-2   -c:v libwebp -quality 82 site/public/assets/how/3-gece.webp
```

520 piksel genişlik, 11rem'lik yuvada 2x için yeterli. Beşi toplam 193 KB.

**`img` etiketinde `width`/`height` varsa CSS'te `height: auto` ŞART.**
Yer ayırsın diye `height="1022"` yazmıştım; CSS yalnız `width` veriyordu
ve tarayıcı yüksekliği 1022 pikselde sabitleyip görselleri gerdi, sayfa
6.500 yerine 10.000 piksel oldu.

### `<details>` içinde çift dil tuzağı

SSS'de her soruyu iki `<summary>` ile yazmıştım (biri `data-tr`, biri
`data-en`). HTML **yalnız ilk** `<summary>`'yi başlık sayıyor: İngilizce
moda geçince ilk summary gizlendiği için bütün SSS kutusu 1 piksele
düşüyor, hiçbir soru görünmüyordu. Doğrusu tek `<summary>` içine iki
`<span>` koymak:

```html
<summary>
  <span data-tr>Soru</span>
  <span data-en>Question</span>
</summary>
```

Aynı tuzak `<table>`/`<caption>` ve `<select>`/`<option>` için de
geçerli — tekil olması beklenen çocuk elemanları çoğaltma.

## Üretime çıkınca değişecek yerler

`site/public/index.html` içinde:

1. `<span class="status">Kapalı testte</span>` rozetlerini sil (iki dil).
2. Google Play düğmesindeki `class="btn soon"` yerine `class="btn"` +
   `href="https://play.google.com/store/apps/details?id=com.lampwickgames.biteclub"`.
3. `<small>Yakında</small>` / `<small>Coming soon</small>` satırlarını sil.

## Dikkat edilecekler

**Oyunun Worker'ına dokunma.** `biteclub.lampwickgames.com` ayrı bir
Worker'dan geliyor ve aktarıcıyı (`/room`, `/stream`, `/send`) o servis
ediyor. Apex alan adını yanlışlıkla Worker'a bağlarsan stüdyo sitesi
yerine oyun açılır.

**Her push'ta yayın olur.** Oyun tarafında yapılan değişiklikler de Pages
yayınını tetikler — zararsız, sadece aynı dosyalar tekrar yüklenir.

**Gizlilik politikası oyunda duruyor:**
`biteclub.lampwickgames.com/privacy`. Mağaza formuna bu adres girilecek.
Sitenin altbilgisi de oraya bağlanıyor.

---

## Stüdyo e-postası — info@lampwickgames.com

Site ve gizlilik politikası artık **info@lampwickgames.com** adresini
gösteriyor. Bu adresin çalışması için Cloudflare'de yönlendirme açılmalı
(ücretsiz):

1. Cloudflare → **lampwickgames.com** → **Email** → **Email Routing** →
   etkinleştir (gerekli DNS kayıtları tek tıkla eklenir).
2. **Destination addresses** → kişisel adresini ekle ve gelen doğrulama
   postasını onayla.
3. **Routing rules** → `info@lampwickgames.com` → kişisel adrese yönlendir.

Bu yapılmadan info@ adresine gelen postalar düşer. Mağaza formlarına bu
adresi girmeden önce bir deneme postası at ve kutuna düştüğünü gör.
