# CLAUDE.md — Proje Kuralları (her oturumda geçerli)

Bu proje: Vampir Köylü — host-otoriter, sunucusuz, çok dilli party oyunu.
Plan dokümanları `README.md` ve `01`–`07` numaralı dosyalardadır; çelişki
durumunda kullanıcıya sor, varsayım yapma.

## Değişmez Prensipler

1. **Sıfır geliştirici maliyeti.** Ücretli servis, API anahtarı gerektiren
   altyapı, aylık faturası olabilecek hiçbir bağımlılık eklenmez.
   Barındırma statik (Cloudflare Pages / GitHub Pages), ağ Trystero P2P.
2. **Host-otoriter model.** Oyun mantığı yalnız host cihazında çalışır.
   Bu prensip hiçbir adapter/refactor'da değişmez.
3. **Hardcoded metin yasak.** Her kullanıcı metni i18n anahtarı (tr + en
   birlikte eklenir). Yeni özellik = önce JSON anahtarları, sonra UI.
4. **Moderatör = deterministik durum makinesi.** Kural mantığında LLM
   kullanılmaz.
5. **Mobil öncelikli UI.** 380–430px baz; masaüstü ortalanmış varyant.
6. **Para mekanizmaları pasif.** Yalnız `entitlements.ts` + `adGate.ts`
   iskeleti; gerçek reklam/ödeme entegrasyonu KULLANICI AÇIKÇA İSTEMEDEN
   yapılmaz.
7. **Roller yalnız 03-roles.md'den.** Orada tanımlı olmayan rol eklenmez,
   kural uydurulmaz; eksikse kullanıcıya sorulur.
8. **Asset eksikse bloke olma.** Düz renk/emoji placeholder ile ilerle,
   eksik dosyayı 06-assets.md isimleriyle kullanıcıya raporla.

## Teknik Sözleşmeler

- Stack: Vite + React 18 + TypeScript (strict) + Tailwind + Zustand +
  i18next + Trystero + Howler. Bu listeye bağımlılık eklemeden önce gerekçeyle sor.
- Ağ erişimi yalnız `NetworkAdapter` arayüzü üzerinden; UI ve oyun motoru
  Trystero'yu doğrudan import etmez.
- Oyun motoru (`src/game/`) UI'dan bağımsız, Vitest ile test edilir.
  Kural değişikliği = test değişikliği.
- Her oyuncuya giden state filtrelenir; başka oyuncunun rolü asla
  yetkisiz istemciye gönderilmez (hayalet modu hariç).
- Commit'ler milestone görev maddeleriyle eşleşir (07-tasks.md).

## Çalışma Şekli

- Sıra: 07-tasks.md'deki milestone sırası. Milestone atlamak için kullanıcı
  onayı gerekir.
- Her milestone sonunda: ne yapıldı + kullanıcı nasıl test eder (gerçek
  cihaz adımlarıyla) özetlenir.
- Belirsizlikte (kural detayı, UI kararı, yeni bağımlılık) durup sor;
  tahminle ilerleme.
