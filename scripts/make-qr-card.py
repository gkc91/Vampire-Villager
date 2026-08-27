# -*- coding: utf-8 -*-
"""A4'e 4 adet A6 masa kartı basan HTML üretir. QR pure-python (segno)."""
import io, os, sys, segno

URL = 'https://lampwickgames.com'
OUT = 'store/qr/masa-karti-a4.html'

qr = segno.make(URL, error='h')          # %30 hata düzeltme: barda leke/aşınma olur
m = [list(row) for row in qr.matrix]
n = len(m)
QUIET = 4                                  # sessiz alan: standart 4 modul
size = n + QUIET * 2

# Her karanlık modül tek bir alt-yol. Tek <path> = küçük dosya, keskin baskı.
parts = []
for r, row in enumerate(m):
    for c, dark in enumerate(row):
        if dark:
            parts.append('M%d %dh1v1h-1z' % (c + QUIET, r + QUIET))
path = ''.join(parts)

qr_svg = (
    '<svg class="qr" viewBox="0 0 {s} {s}" xmlns="http://www.w3.org/2000/svg" '
    'shape-rendering="crispEdges" role="img" aria-label="{url}">'
    '<rect width="{s}" height="{s}" fill="#fff"/>'
    '<path d="{p}" fill="#0b0817"/></svg>'
).format(s=size, p=path, url=URL)

CARD = u"""      <div class="card">
        <div class="studio">&#128367;&#65039; LAMPWICK GAMES</div>

        <div class="title">BITE CLUB</div>
        <div class="tagline">Aran&#305;zda kan i&#231;en biri var.</div>

        <div class="qbox">{qr}</div>

        <div class="cta">Telefonunu okut, hemen oyna</div>
        <div class="url">lampwickgames.com</div>

        <div class="facts">4&#8211;24 K&#304;&#350;&#304; &#183; KURULUM YOK &#183; &#220;CRETS&#304;Z</div>
      </div>
"""

html = u"""<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <title>Bite Club — A6 masa kartı</title>
    <style>
      /* A4'e 2x2 dizilmiş dört A6 kart (A6 = 105x148 mm, A4 = 210x297 mm).
         Kartlar hücreyi tam doldurmuyor: yazıcıların ~5 mm basamadığı kenar
         payı var, kenara dayalı koyu zemin kırpılırdı. Beyaz boşluk aynı
         zamanda kesme payı — koyu kart / beyaz kağıt sınırı makasla
         izlenecek kadar belirgin. */
      @page {{ size: A4; margin: 0; }}
      * {{ box-sizing: border-box; margin: 0; padding: 0; }}

      body {{
        background: #b9b9c4;              /* ekranda kağıdı ayırt etmek için */
        font-family: "Segoe UI", system-ui, sans-serif;
      }}
      .sheet {{
        width: 210mm; height: 297mm; background: #fff;
        margin: 0 auto; padding: 5mm;
        display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;
      }}
      .card {{
        width: 95mm; height: 138mm; justify-self: center; align-self: center;
        background: radial-gradient(120% 90% at 50% 0%, #2a1c4f 0%, #0b0817 62%);
        color: #ece9f5; border-radius: 4mm;
        padding: 8mm 7mm 7mm;
        display: flex; flex-direction: column; align-items: center;
        text-align: center;
      }}

      .studio {{
        font-size: 7pt; letter-spacing: 0.18em; color: #ffb84d;
        margin-bottom: 6mm;
      }}
      .title {{
        font-size: 27pt; font-weight: 800; letter-spacing: 0.02em;
        line-height: 1; color: #fff;
      }}
      .tagline {{
        font-size: 10pt; color: #c9c2e0; margin-top: 2.5mm; line-height: 1.35;
      }}

      /* QR beyaz zeminde: ters kontrastl&#305; QR'&#305; her okuyucu &#231;&#246;zemiyor. */
      .qbox {{
        background: #fff; border-radius: 3mm; padding: 3mm;
        margin: 6mm 0 5mm;
      }}
      .qr {{ display: block; width: 46mm; height: 46mm; }}

      .cta {{ font-size: 11pt; font-weight: 700; }}
      .url {{ font-size: 9.5pt; color: #ffb84d; margin-top: 1.5mm; }}

      .facts {{
        margin-top: auto; padding-top: 4mm;
        font-size: 6.5pt; letter-spacing: 0.12em; color: #9b93b8;
      }}

      @media print {{
        body {{ background: #fff; }}
        .sheet {{ margin: 0; }}
        /* Koyu zemin baskıda kaybolmasın. */
        .card {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
      }}
    </style>
  </head>
  <body>
    <div class="sheet">
{cards}    </div>
  </body>
</html>
"""

card = CARD.format(qr=qr_svg)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
io.open(OUT, 'w', encoding='utf-8', newline='\n').write(html.format(cards=card * 4))
print('%s yazildi (QR surum %s, %dx%d modul, %s)'
      % (OUT, qr.version, n, n, URL))
