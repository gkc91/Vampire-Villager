# Cloudflare Observability (MCP)

`.mcp.json` içinde tek bir sunucu tanımlı: Cloudflare'in **Workers
Observability** sunucusu. İşi, `vampire-villager` Worker'ının günlüklerini
ve metriklerini doğrudan okuyabilmek.

## Neden bu, neden sadece bu

Aktarıcı bu uygulamanın en kırılgan yeri: WebSocket engelli ağlar, HTTP
yedeği, farklı operatörler. "Bağlanamadım" diyen bir testçi olduğunda
`worker/index.ts` içindeki `logEvent` satırlarına — özellikle
`HEDEF BULUNAMADI — mesaj düştü` — bakmak gerekiyor.

Bu sunucu gelmeden önce yol şuydu: panelden JSON'u kopyala, sohbete
yapıştır. Bir kez yapıldı, işe yaradı ama yavaş.

Cloudflare'in on altı MCP sunucusu var (DNS Analytics, Logpush, AI
Gateway, AutoRAG, CASB, Radar…). Bu projede karşılığı olan tek şey
günlükler. Gerisi eklenmedi: kullanılmayan bağlantı, gürültüden başka
bir şey değil.

**Yapamadıkları** (beklenti kurmadan önce):

- **Worker yayınlayamaz.** `npx wrangler deploy` yerine geçmez.
- **Route / özel alan adı yönetemez.** `*.lampwickgames.com/*` joker
  route'unun `biteclub.lampwickgames.com`'u ele geçirip oyunu düşürdüğü
  olayı ne görebilir ne engelleyebilirdi.

Yani "Cloudflare'i devral" değil, "günlükleri okuyabil".

## Bağlanma

Token yok. Claude Code uzak MCP sunucularında OAuth'u kendisi yürütüyor:
RFC 9728 ile uçları buluyor, istemciyi dinamik kaydediyor, jetonu güvenli
saklıyor ve süresi dolunca yeniliyor. `.mcp.json` içinde `headers` alanı
olmamasının sebebi bu — dosyada saklanacak bir sır yok, o yüzden depoya
girmesi de sakıncasız.

Bağlanmak için Claude Code içinde:

```
/mcp
```

Sunucuyu seç, açılan tarayıcı penceresinden Cloudflare hesabınla giriş
yap. Bu komut etkileşimli bir panel açıyor; bulunduğun arayüzde yoksa
terminalden:

```bash
claude mcp login cloudflare-observability
```

## Maliyet

Sunucu ücretsiz. Cloudflare "bazı özellikler ücretli Workers planı
gerektirebilir" diyor; günlük okuma bunlardan biri değil.

Observability zaten açık — `wrangler.jsonc` içinde
`"observability": { "enabled": true }`. Ücretsiz planda günde 200.000
olay; yalnız yaşam döngüsü olayları yazdığımız için o sınıra yaklaşmak
zor. **Ücretli hiçbir şey açılmayacak** (projenin birinci prensibi).

## Kapsam

Giriş yaparken Cloudflare hesabının tamamına erişim veriyorsun, yalnız
bu Worker'a değil. Sunucunun kendisi okuma amaçlı, ama yetkiyi daraltmak
istersen Cloudflare panelinden dar kapsamlı bir API token üretip
`.mcp.json` içine `headers` ile verebilirsin:

```json
"headers": { "Authorization": "Bearer ..." }
```

Bu durumda **dosya depoya girmemeli** — `.gitignore`'a ekle. OAuth yolu
bu yüzden daha temiz: saklanacak sır yok.
