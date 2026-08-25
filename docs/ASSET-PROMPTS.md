# Asset Üretim Kiti (Banana/Gemini + Suno)

06-assets.md'deki listeyi üretmek için hazır prompt'lar. Üretilen dosyayı
doğru isimle `public/assets/` altına koyduğun an oyunda görünür — kod
değişikliği gerekmez, eksik dosya varsa yer tutucu gösterilir.

**Prompt'lar İngilizce.** Görsel modelleri İngilizce'de belirgin biçimde
daha iyi sonuç veriyor; çevirme.

## Gerçekten gereken 11 görsel

| Dosya | Boyut | Koda bağlı mı |
|---|---|---|
| `roles/vampire.webp` `villager` `seer` `doctor` `hunter` | 512×768 | ✅ rol kartı ekranı |
| `bg/night.webp` `day` `lobby` `death` | 1080×1920 | ✅ ekran arka planları |
| `icon/app-icon.png` | 1024×1024 | ✅ PWA / ana ekrana ekle |
| `icon/favicon.png` | 512×512 | ✅ sekme ikonu |
| `ui/tombstone.webp` `fang` `sun` | 256×256 | ❌ **şu an kullanılmıyor** |

Son satırı üretme; istersen sonra koda bağlarım, o zaman üretirsin.

## Stil tutarlılığı — önce bunu oku

1. Önce **vampire** kartını üret. Beğenene kadar tekrarla.
2. Beğendiğin kartı Gemini'ye **referans görsel** olarak yükle ve sonraki
   kartlarda prompt'un başına şunu ekle:
   *"Match the exact art style, palette, lighting and framing of the
   reference image."*
3. Diğer dördünü böyle üret. Kartların birbirine benzemesi, tek tek
   güzel olmalarından daha önemli.

Arka planlarda da aynı yöntem: önce `night`, sonra diğerleri referansla.

### Ortak stil cümlesi

Her prompt'ta zaten var, ama elle yeni bir görsel üretirken başa ekle:

```
dark gothic village setting, stylized painterly comic-book illustration,
muted deep violet and navy palette with a single blood-red accent,
moonlit rim lighting, heavy atmosphere, no text, no letters, no watermark,
no logo, no signature
```

## Rol Kartları (512×768 · 2:3 dikey)

Ortak kadraj: karakter ortada, bel üstü, izleyiciye dönük, arka plan koyu
ve sade (kart üstünde yazı duracak, arka plan kalabalık olmasın).

### `roles/vampire.webp`

```
dark gothic village setting, stylized painterly comic-book illustration,
muted deep violet and navy palette with a single blood-red accent,
moonlit rim lighting, no text, no watermark.
Waist-up portrait of an aristocratic vampire: pale grey skin, sharp
cheekbones, sunken crimson eyes, subtle fangs, high-collared black cloak
with deep red silk lining, gloved hand resting at the collar. Standing in
cold moonlight, thin fog behind. Dramatic side lighting, dark vignette
background, vertical 2:3 composition.
```

### `roles/villager.webp`

```
[referans görseli ekle] Match the exact art style, palette, lighting and
framing of the reference image.
Waist-up portrait of a weary village peasant: sheepskin vest over a coarse
linen shirt, flat cap, calloused hands holding an oil lantern that lights
the face from below, suspicious sideways glance, tired eyes. Dark vignette
background, vertical 2:3 composition, no text.
```

### `roles/seer.webp`

```
[referans görseli ekle] Match the exact art style, palette, lighting and
framing of the reference image.
Waist-up portrait of an old fortune teller woman: layered shawls, coin
jewellery on the forehead, hands hovering over a glowing crystal ball,
swirling smoke, candle flames out of focus behind. Violet glow lighting the
face from below. Dark vignette background, vertical 2:3 composition, no text.
```

### `roles/doctor.webp`

```
[referans görseli ekle] Match the exact art style, palette, lighting and
framing of the reference image.
Waist-up portrait of a village healer: leather apron over a long dark coat,
satchel of dried herbs and small glass vials, a low-burning oil lamp in one
hand, calm determined expression. Warm amber light on the face against the
cold background. Dark vignette background, vertical 2:3 composition, no text.
```

### `roles/hunter.webp`

```
[referans görseli ekle] Match the exact art style, palette, lighting and
framing of the reference image.
Waist-up portrait of a rugged hunter: wolf-pelt cape over one shoulder,
crossbow held across the chest, quiver of bolts, a scar across the cheek,
hard narrowed eyes. Standing in fog with moonlight from behind creating a
strong rim light. Dark vignette background, vertical 2:3 composition, no text.
```

## Arka Planlar (1080×1920 · 9:16 dikey)

> **Kritik:** Ekranın ortasında yazı ve butonlar duruyor. Prompt'lardaki
> *"calm, dark, uncluttered center"* ifadesini silme — yoksa metin okunmaz.
> İnsan figürü de isteme, oyuncu listesi orayı kaplıyor.

### `bg/night.webp`

```
dark gothic village at midnight, stylized painterly comic-book illustration,
muted deep violet and navy palette, full moon high above, crooked wooden
houses lining an empty dirt street, thick ground fog, bare branches,
no people, no text, no watermark.
Vertical 9:16 composition with a calm, dark, uncluttered center; detail and
contrast only near the top and bottom edges. Strong vignette.
```

### `bg/day.webp`

```
[referans: night] Match the exact art style and palette of the reference image,
but at overcast noon.
Empty village square, wet cobblestones, closed wooden market stalls, distant
grey hills, low clouds, desaturated cold daylight, no people, no text.
Vertical 9:16 composition with a calm, uncluttered center; detail only near
the top and bottom edges.
```

### `bg/lobby.webp`

```
[referans: night] Match the exact art style and palette of the reference image.
The entrance of a village at dusk: a weathered wooden gate, an old signpost,
lanterns just being lit, a dirt path leading inward, warm lantern glow against
deep blue dusk, no people, no text.
Vertical 9:16 composition with a calm, uncluttered center.
```

### `bg/death.webp`

```
[referans: night] Match the exact art style and palette of the reference image.
An old graveyard at night: leaning weathered headstones, one bare twisted
tree, crows on the branches, thick ground fog, a low blood-red moon on the
horizon, no people, no text.
Vertical 9:16 composition with a calm, dark, uncluttered center. Strong vignette.
```

## Uygulama İkonu (1024×1024 kare)

### `icon/app-icon.png`

```
App icon: a vampire silhouette merged with a crescent moon, flat bold
emblem style, thick clean shapes, deep violet background, single blood-red
accent, strong contrast, centered, generous margin, fully readable at 48
pixels, no text, no letters, no watermark.
```

`favicon.png` ayrı üretme — aynı dosyadan küçültülüyor (aşağıdaki komut).

## Boyutlandırma ve Dönüştürme

Modeller webp vermez; indirdiğin PNG/JPG'yi şu komutlarla dönüştür.
`ffmpeg` makinende kurulu, komutları proje kökünde çalıştır.

**Rol kartı** (indirdiğin dosya `vampire.png` ise):

```bash
ffmpeg -i vampire.png -vf "scale=512:768:force_original_aspect_ratio=increase,crop=512:768" -c:v libwebp -quality 82 public/assets/roles/vampire.webp
```

**Arka plan**:

```bash
ffmpeg -i night.png -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -c:v libwebp -quality 80 public/assets/bg/night.webp
```

**İkonlar** (tek kaynaktan ikisi birden):

```bash
ffmpeg -i icon.png -vf scale=1024:1024 public/assets/icon/app-icon.png
```

```bash
ffmpeg -i icon.png -vf scale=512:512 public/assets/icon/favicon.png
```

## Müzik (Suno)

Hepsi **enstrümantal** ve **loop edilebilir** olmalı. Suno genelde 2 dakika
üretir; aşağıdaki komutla kırp.

| Dosya | Prompt |
|---|---|
| `audio/music/lobby.mp3` | `instrumental folk-gothic village waltz, plucked strings, light hand percussion, playful but slightly uneasy, minor key, loopable, no vocals` |
| `audio/music/night.mp3` | `instrumental dark ambient, low sustained drones, distant cello, sparse heartbeat pulse, creeping dread, almost no melody, loopable, no vocals` |
| `audio/music/day.mp3` | `instrumental suspense bed, ticking clock rhythm, pizzicato strings, slowly building tension, mid tempo, loopable, no vocals` |
| `audio/music/win_village.mp3` | `short instrumental victory fanfare, warm strings and horns, sunrise relief, triumphant, no vocals` |
| `audio/music/win_vampires.mp3` | `short instrumental dark victory theme, low brass, choir-like pads, triumphant menace, no vocals` |

Kırpma (lobi/gece/gündüz için 90 sn, zafer temaları için 18 sn):

```bash
ffmpeg -i suno-indirilen.mp3 -ss 0 -t 90 -c copy public/assets/audio/music/night.mp3
```

Loop dikişini duymamak için sessizlikle biten değil, akışın ortasından
90 saniyelik bir kesit al (`-ss 15 -t 90` gibi).

## SFX (CC0 — indireceğin yerler)

Suno bunlar için uygun değil. **freesound.org** (arama sonrası solda
*License → Creative Commons 0* filtresini seç) veya **pixabay.com/sound-effects**
(hepsi ücretsiz kullanım).

| Dosya | Arama terimi |
|---|---|
| `audio/sfx/wolf_howl.mp3` | `wolf howl night` |
| `audio/sfx/rooster.mp3` | `rooster crow morning` |
| `audio/sfx/bell.mp3` | `church bell single toll` |
| `audio/sfx/death.mp3` | `dark impact sting` / `horror hit` |
| `audio/sfx/click.mp3` | `ui click soft` |
| `audio/sfx/heartbeat.mp3` | `heartbeat slow single` |

Hepsi kısa olmalı (tık sesi < 0.2 sn, uluma < 3 sn). Uzunsa kırp:

```bash
ffmpeg -i indirilen.wav -ss 0 -t 2.5 -ar 44100 -b:a 128k public/assets/audio/sfx/wolf_howl.mp3
```

> **Lisans notu:** indirdiğin her SFX'in kaynak linkini ve lisansını
> `public/assets/CREDITS.md` dosyasına yaz. Mağazaya çıkarken lazım olacak.

## Yerleştirdikten Sonra

Dosyaları koyunca `npm run dev` çalışıyorsa sayfayı yenilemen yeterli;
Vite `public/` klasörünü doğrudan sunar. Eksik olanlar yer tutucu
göstermeye devam eder, oyun hiçbir durumda bozulmaz.

Yerleşimi görmek için:

```bash
find public/assets -type f -not -name ".gitkeep"
```

Doğru gittiğini anlamanın en kolay yolu: bir rol kartı koyup oyunu aç.
Emoji yerine görselin çıkıyorsa yol doğru, kalanları aynı şekilde koy.
