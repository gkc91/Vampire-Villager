# Stüdyo Sitesi — lampwickgames.com

`site/` klasöründeki tek sayfalık stüdyo sitesi. Derleme adımı yok; düz
HTML, tek dosya. Oyunun kendisiyle karıştırılmasın:

| Adres | Ne servis eder | Nereden |
|---|---|---|
| `lampwickgames.com` | Stüdyo sitesi | Cloudflare **Pages** ← `site/` |
| `biteclub.lampwickgames.com` | Oyunun kendisi | Cloudflare **Worker** ← `dist/` |

Rol görselleri kopyalanmaz, oyunun canlı adresinden çekilir. Tek kaynak
kalır: bir rol kartı güncellendiğinde site de kendiliğinden güncellenir.

---

## GitHub üzerinden yayın (otomatik)

Her `main` push'unda site kendiliğinden güncellenir.

### Bir kerelik kurulum

1. Cloudflare paneli → **Workers & Pages** → **Create** → **Pages** sekmesi
   → **Connect to Git**.
2. GitHub hesabını bağla, **Vampire-Villager** deposunu seç.
3. Derleme ayarlarını **tam olarak şöyle** doldur:

   | Alan | Değer |
   |---|---|
   | Framework preset | **None** |
   | Build command | **boş bırak** |
   | Build output directory | **`site`** |
   | Root directory | `/` (varsayılan) |
   | Production branch | `main` |

   > Build command'ı boş bırakmak önemli: sitede derlenecek bir şey yok.
   > Buraya `npm run build` yazarsan Pages oyunu derler ve yanlış klasörü
   > yayınlar.

4. **Save and Deploy**. İlk yayın bir dakika sürer,
   `<proje-adı>.pages.dev` adresinde çıkar.

### Alan adını bağlama

5. Aynı Pages projesinde → **Custom domains** → **Set up a domain** →
   `lampwickgames.com`.
6. Alan adı zaten Cloudflare'de olduğu için DNS kaydı kendiliğinden
   eklenir; onaylaman yeterli.
7. `www.lampwickgames.com` de istersen ikinci bir custom domain olarak
   ekle.

### Sonrası

Artık `site/index.html`'i değiştirip push etmek yeterli. Pages değişikliği
görüp yeniden yayınlar; ayrıca her push için önizleme adresi üretir.

---

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

## Stüdyo e-postası (isteğe bağlı, ücretsiz)

Şu an sitede ve gizlilik politikasında kişisel adres yazıyor. Alan adı
Cloudflare'de olduğu için **Email Routing** ile ücretsiz bir stüdyo adresi
açılabilir:

Cloudflare → alan adı → **Email** → **Email Routing** → `hello@lampwickgames.com`
adresini kişisel adrese yönlendir. Gelen postalar aynı kutuya düşer, ama
dışarıya kişisel adres görünmez.

Açarsan iki yerde güncellenecek: `site/index.html` ve `public/privacy.html`.
