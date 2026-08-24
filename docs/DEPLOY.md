# Yayınlama

İki hedef de ücretsiz ve statiktir; ikisi de aynı `dist/` çıktısını sunar.
`.github/workflows/deploy.yml` main'e her push'ta derler, testleri ve
i18n taramasını çalıştırır, sonra yayınlar.

## Hangi yol?

Üçü de ücretsiz ve statik; aynı `dist/` çıktısını sunar. Fark yalnız
adres ve kurulum kolaylığıdır — **hosting seçimi oyunun P2P bağlantı
kalitesini etkilemez**, dosyaları servis etmekten başka iş yapmaz.

| Yol | Adres | Not |
|---|---|---|
| **Vercel** | `proje-adi.vercel.app` | En temiz adres, private depoda ücretsiz |
| Cloudflare Workers | `proje.hesap.workers.dev` | Kurulu; adres hesap adını içerir |
| GitHub Pages | `kullanici.github.io/depo` | Depo public olmalı |

## Vercel (önerilen — adres en temizi)

1. vercel.com → GitHub ile giriş yap (ücretsiz Hobby planı, kart istemez).
2. **Add New → Project** → `Vampire-Villager` deposunu içe aktar.
3. Vercel Vite'ı otomatik tanır; ayarları değiştirme (depodaki
   `vercel.json` build komutunu, çıktı dizinini ve SPA yönlendirmesini
   zaten tanımlıyor).
4. **Project Name** alanına ne yazarsan adres o olur: `vampir-koylu`
   yazarsan `vampir-koylu.vercel.app`.
5. Deploy. Bundan sonra her push otomatik yayınlanır.

Ortam değişkeni gerekirse (ör. `VITE_TURN_URLS`): Project → Settings →
Environment Variables. `VITE_` ile başlayanlar derleme sırasında paketin
içine gömülür, değişiklikten sonra yeniden derleme gerekir.

Aynı depoyu hem Vercel'de hem Cloudflare'de tutabilirsin; ikisi de aynı
commit'ten yayınlar. Cloudflare'i bırakacaksan panelden Worker'ı silmen
yeterli.

GitHub Pages ücretsiz planda **yalnız public depolarda** çalışır. Depo private
kaldığı sürece workflow'daki `github-pages` işi kendiliğinden atlanır, CI
kırmızı yanmaz; depoyu public yaptığın an devreye girer.

## GitHub Pages (depo public ise)

1. Repo → Settings → General → Danger Zone → **Change visibility** → Public.
2. Repo → Settings → Pages → Source: **GitHub Actions**.
3. main'e push → `github-pages` işi yayınlar.

Proje sitesi alt yolda (`/repo-adi/`) yayınlandığı için workflow
`BASE_PATH` değişkenini otomatik ayarlar. Elle derlerken:

```bash
BASE_PATH=/repo-adi/ npm run build
```

## Cloudflare Pages (private depo veya özel alan adı)

Workflow'daki `cloudflare-pages` işi yalnız şu değişken tanımlıysa çalışır:

- Repo → Settings → Secrets and variables → **Variables**:
  `CLOUDFLARE_PROJECT_NAME` = Pages proje adın
- **Secrets**:
  `CLOUDFLARE_API_TOKEN` (Pages: Edit yetkili token)
  `CLOUDFLARE_ACCOUNT_ID`

**Panelden bağla (secret gerekmez, önerilen):**
dash.cloudflare.com → Workers & Pages → Create → Connect to Git →
depoyu seç (private depolar da listelenir). Ayarlar:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

Cloudflare artık yeni projeleri "Workers" olarak kuruyor; yayın ayarları
depodaki **`wrangler.jsonc`** dosyasından okunur:

```jsonc
{
  "name": "vampire-villager",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  }
}
```

Bu dosya olmadan `wrangler deploy` projeyi otomatik yapılandırmaya çalışır ve
"Vite 6.0.0+ gerekli" hatası verir. Dosya varsa Vite sürümüne bakmaz.

> `public/_redirects` KULLANMA. O dosya Cloudflare **Pages**'e aitti; Workers
> assets onu farklı yorumluyor ve `/*  /index.html  200` kuralını "sonsuz
> döngü" sayıp yayını reddediyor. SPA yönlendirmesi `not_found_handling`
> ile zaten çözülüyor.

Yerelde doğrulamak için:

```bash
npm run build && npx wrangler deploy --dry-run
```

## Aktarıcı (oyun bağlantısı) nerede çalışıyor?

Oyun mesajları Cloudflare Worker'daki Durable Object üzerinden geçer
(`worker/index.ts`). Statik siteyi nerede barındırdığın buna göre değişir:

| Site nerede | Ayar |
|---|---|
| Cloudflare Worker (aynı adres) | Ayar gerekmez; aktarıcı adresi origin'den bulunur |
| Vercel / GitHub Pages | `VITE_RELAY_URL=wss://vampire-villager.<hesap>.workers.dev` ortam değişkenini ekle |

Vercel'de: Project → Settings → Environment Variables → `VITE_RELAY_URL`.
`VITE_` değişkenleri derlemeye gömülür, ekledikten sonra yeniden derle.

Aktarıcıyı yayınlamak için Cloudflare tarafında `npx wrangler deploy`
çalışır (depo bağlıysa her push'ta kendiliğinden).

Yerel geliştirmede aktarıcıyı ayrı çalıştır:

```bash
npm run dev:relay
```

ve `.env` içine `VITE_RELAY_URL=ws://localhost:8787` yaz.

## Yerel derleme ve önizleme

```bash
npm run build
npm run preview
```

## Yayın öncesi kontrol listesi

```bash
npm run check
```

`lint:strings` (hardcoded metin taraması) + `test` (56 test) + `build`
zincirini çalıştırır. Üçü de yeşil değilse yayınlama.

Ek olarak:

- [ ] `public/assets/` altındaki görsel/ses dosyaları yerinde mi
      (eksikse oyun çalışır ama placeholder gösterir — 06-assets.md).
- [ ] `public/assets/CREDITS.md` dolduruldu mu (SFX lisansları).
- [ ] Gerçek cihazda bir tur oynandı mı (docs/TESTING.md).
