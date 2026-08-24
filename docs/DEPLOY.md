# Yayınlama

İki hedef de ücretsiz ve statiktir; ikisi de aynı `dist/` çıktısını sunar.
`.github/workflows/deploy.yml` main'e her push'ta derler, testleri ve
i18n taramasını çalıştırır, sonra yayınlar.

## GitHub Pages (kurulum gerektirmeyen yol)

1. Depoyu GitHub'a it.
2. Repo → Settings → Pages → Source: **GitHub Actions**.
3. main'e push → `github-pages` işi yayınlar.

Proje sitesi alt yolda (`/repo-adi/`) yayınlandığı için workflow
`BASE_PATH` değişkenini otomatik ayarlar. Elle derlerken:

```bash
BASE_PATH=/repo-adi/ npm run build
```

## Cloudflare Pages (özel alan adı istersen)

Workflow'daki `cloudflare-pages` işi yalnız şu değişken tanımlıysa çalışır:

- Repo → Settings → Secrets and variables → **Variables**:
  `CLOUDFLARE_PROJECT_NAME` = Pages proje adın
- **Secrets**:
  `CLOUDFLARE_API_TOKEN` (Pages: Edit yetkili token)
  `CLOUDFLARE_ACCOUNT_ID`

Cloudflare panelinden elle de bağlayabilirsin:
Build command `npm run build`, output dizini `dist`.
`public/_redirects` SPA yönlendirmesini halleder.

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
