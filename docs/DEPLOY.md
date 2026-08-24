# Yayınlama

İki hedef de ücretsiz ve statiktir; ikisi de aynı `dist/` çıktısını sunar.
`.github/workflows/deploy.yml` main'e her push'ta derler, testleri ve
i18n taramasını çalıştırır, sonra yayınlar.

## Hangi yol?

| Durum | Yol |
|---|---|
| Depo **public** | GitHub Pages — ek hesap gerekmez |
| Depo **private** kalsın | Cloudflare Pages — private depoda da ücretsiz |

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

**Daha kolay yol — panelden bağla (secret gerekmez):**
dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git →
depoyu seç (private depolar da listelenir) → Build command `npm run build`,
output dizini `dist`. Her push'ta kendi derler.
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
