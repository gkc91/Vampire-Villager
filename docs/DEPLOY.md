# Yayınlama

İki hedef de ücretsiz ve statiktir; ikisi de aynı `dist/` çıktısını sunar.
`.github/workflows/deploy.yml` main'e her push'ta derler, testleri ve
i18n taramasını çalıştırır, sonra yayınlar.

## Yayın: Cloudflare Workers

Site ve oyun aktarıcısı **aynı Worker'dan** servis edilir:
`vampire-villager.<hesap>.workers.dev`. Depo Cloudflare'e bağlı olduğu için
`main`'e her push otomatik yayınlanır (build `npm run build`,
deploy `npx wrangler deploy`; ayarlar `wrangler.jsonc`'de).

Yayınlanan Worker iki işi birden yapar:

- `/` ve statik dosyalar → `dist/` (SPA yönlendirmesi dahil)
- `/room/:kod` → WebSocket aktarıcısı (Durable Object)

### Özel alan adı bağlamak

Alan adını aldıktan sonra (Cloudflare Registrar maliyetine satar, .com için
yıllık ~10–12 $) Cloudflare panelinden Worker'a **Custom Domain** olarak
bağlanır. Kod tarafında değişiklik gerekmez: aktarıcı adresi siteyi sunan
origin'den türetilir, origin süzgeci de aynı-origin kuralıyla çalışır.

> Siteyi aktarıcıdan FARKLI bir sunucuya taşırsan iki yerde ayar gerekir:
> istemcide `VITE_RELAY_URL`, Worker'da `isAllowedOrigin` listesi.

### GitHub Pages (yedek yol)

`.github/workflows/deploy.yml` içindeki Pages işi depo public olduğunda
kendiliğinden devreye girer. Pages yalnız statik dosya sunar; oyun
bağlantısı yine Cloudflare'deki aktarıcıya gider.

## Aktarıcı (oyun bağlantısı) nerede çalışıyor?

Oyun mesajları Cloudflare Worker'daki Durable Object üzerinden geçer
(`worker/index.ts`). Statik siteyi nerede barındırdığın buna göre değişir:

| Site nerede | Ayar |
|---|---|
| Cloudflare Worker (aynı adres) | Yok — aktarıcı adresi origin'den türetilir |
| Yerel geliştirme | `.env` içine `VITE_RELAY_URL=ws://localhost:8787` |

Aktarıcı yalnız siteyi sunan origin'den, `*.workers.dev` adreslerinden,
yerel geliştirmeden ve native kabuktan (Origin başlığı yok) gelen
bağlantıları kabul eder. Başka sitelerden gelen istek 403 alır — ücretsiz
kota böyle korunur.

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
