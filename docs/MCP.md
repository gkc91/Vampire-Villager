# Cloudflare MCP — değerlendirildi, vazgeçildi

**Karar (28 Ağustos 2026): kurulmadı.** `.mcp.json` silindi.

## Ne düşünülmüştü

Cloudflare'in **Workers Observability** sunucusu
(`https://observability.mcp.cloudflare.com/mcp`), `vampire-villager`
Worker'ının günlüklerini panele girmeden okuyabilmek için. Aktarıcı bu
uygulamanın en kırılgan yeri; "bağlanamadım" diyen bir testçi olduğunda
`logEvent` satırlarına bakmak gerekiyor.

Cloudflare'in on altı MCP sunucusundan bu projede karşılığı olan tek şey
buydu. DNS Analytics, Logpush, AI Gateway, AutoRAG, CASB, Radar: karşılığı
yok.

## Neden vazgeçildi

Kurulum, kazandıracağı hızdan fazla uğraş çıkardı:

- Makinede **bağımsız `claude` CLI yok** — yalnız masaüstü uygulaması var
  (`AppData/Local/AnthropicClaude`). Yani `claude mcp add` ve
  `claude mcp login` kullanılamıyor.
- Masaüstü arayüzünde `/mcp`, Claude Code'un MCP panelini değil
  **Connectors Directory**'yi (Anthropic'in incelediği hazır bağlayıcı
  listesi) açıyor. Bizim sunucumuz orada listelenmiş bir bağlayıcı
  değil, projeye ait yapılandırma — arama sonuç vermiyor.
- Proje kapsamlı `.mcp.json` yalnız **açılışta** okunup onaylanıyor;
  oturum ortasında eklenince görünmüyor.

Mevcut yol yeterli: testçiden sorun gelirse Cloudflare panelinden günlük
kopyalanıp sohbete yapıştırılıyor. Bir kez yapıldı, sorunu çözdü.

## Yeniden bakılırsa

Zaten doğrulanmış olanlar:

- Yapılandırma bu kadar — token gerekmiyor, Claude Code OAuth'u kendi
  yürütüyor (keşif ucu RFC 9728 metadatasını 200 ile veriyor):

  ```json
  { "mcpServers": { "cloudflare-observability": {
      "type": "http",
      "url": "https://observability.mcp.cloudflare.com/mcp" } } }
  ```

- Önce `npm i -g @anthropic-ai/claude-code` ile CLI kur, ya da dosyayı
  koyup Claude Code'u bu klasörde yeniden başlat.

**Beklenti kurma:** bu sunucu Worker **yayınlayamaz** ve route / özel alan
adı **yönetemez**. `npx wrangler deploy` yerine geçmez, joker route'un
oyunu düşürdüğü olayı da engelleyemezdi. Yaptığı tek şey günlük okumak.

## Cloudflare panelinde yapılacak bir şey yok

Zero Trust altındaki **MCP Portals**, MCP sunucularını Cloudflare üzerinden
vekilleyip erişim politikası uygulamak içindir — bizim ihtiyacımızın tersi
ve muhtemelen ücretli. O ekranda hiçbir şey kurma.
