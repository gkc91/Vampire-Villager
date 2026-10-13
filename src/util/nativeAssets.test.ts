import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Uygulama simgesi ve açılış ekranı GERÇEKTEN BİZİM Mİ?
 *
 * NEDEN TEST VAR: `npx cap add ios/android` platform klasörünü Capacitor'ın
 * şablon görselleriyle kuruyor — beyaz zeminde mavi bir işaret. Hiçbir şeyi
 * bozmuyor: derleme geçiyor, testler geçiyor, uygulama açılıyor. Fark
 * edilmesinin tek yolu birinin paketi açıp bakması. Bakılmadı ve mağazaya
 * öyle gitti:
 *
 *   - iOS 2.2 (derleme 2) incelemeden döndü: Guideline 2.3.8,
 *     "the app icons appear to be placeholder icons" (9 Ekim 2026).
 *   - Android'de de yayındaydı: her açılışta Capacitor'ın işareti.
 *
 * ÖLÇÜT RENK, HASH DEĞİL: dosyayı yeniden kodlamak (farklı sıkıştırma,
 * farklı ffmpeg sürümü) hash'i değiştirir ama görseli değiştirmez. Zemin
 * rengine bakmak hem şablonu yakalıyor (beyaz) hem de meşru yeniden
 * üretimde yanlış alarm vermiyor.
 *
 * Görselleri üreten: scripts/make-native-assets.mjs
 */

const KOK = resolve(__dirname, '../..');

/** Marka moru — `public/assets/icon/app-icon.png`'nin zemini. */
const MOR = { r: 0x46, g: 0x1b, b: 0x83 };
const TOLERANS = 12;

type Png = { w: number; h: number; pikseller: Uint8Array };

/**
 * 8-bit RGB (renk tipi 2), aralıksız PNG okur — ffmpeg'in `-pix_fmt rgb24`
 * ile yazdığı biçim. Başka biçim gelirse fırlatıyor: iOS simgesi için
 * alfasız RGB zaten Apple'ın şartı, sessizce geçmemeli.
 */
function pngOku(yol: string): Png {
  const d = readFileSync(yol);
  if (d.readUInt32BE(0) !== 0x89504e47) throw new Error(`PNG değil: ${yol}`);

  const w = d.readUInt32BE(16);
  const h = d.readUInt32BE(20);
  const derinlik = d[24];
  const renkTipi = d[25];
  const aralikli = d[28];
  if (derinlik !== 8 || renkTipi !== 2) {
    throw new Error(`${yol}: 8-bit RGB bekleniyordu (derinlik ${derinlik}, renk tipi ${renkTipi})`);
  }
  if (aralikli !== 0) throw new Error(`${yol}: aralıklı (interlaced) PNG desteklenmiyor`);

  // IDAT parçaları bitişik olmak zorunda değil; hepsi birleştirilip açılıyor.
  const parcalar: Buffer[] = [];
  let p = 8;
  while (p < d.length) {
    const uzunluk = d.readUInt32BE(p);
    const tip = d.toString('ascii', p + 4, p + 8);
    if (tip === 'IDAT') parcalar.push(d.subarray(p + 8, p + 8 + uzunluk));
    if (tip === 'IEND') break;
    p += 12 + uzunluk;
  }
  const ham = inflateSync(Buffer.concat(parcalar));

  // Satır süzgeçlerini geri al (PNG spec 9.2). Her satır bir süzgeç baytıyla
  // başlıyor, kalanı bir önceki satıra ve soldaki piksele göre kodlanmış.
  const bpp = 3;
  const satir = w * bpp;
  const cikti = new Uint8Array(h * satir);
  let onceki = new Uint8Array(satir);
  for (let y = 0; y < h; y++) {
    const suzgec = ham[y * (satir + 1)];
    const giris = ham.subarray(y * (satir + 1) + 1, (y + 1) * (satir + 1));
    const bu = new Uint8Array(satir);
    for (let i = 0; i < satir; i++) {
      const sol = i >= bpp ? bu[i - bpp] : 0;
      const ust = onceki[i];
      const solUst = i >= bpp ? onceki[i - bpp] : 0;
      let deger: number;
      switch (suzgec) {
        case 0: deger = giris[i]; break;
        case 1: deger = giris[i] + sol; break;
        case 2: deger = giris[i] + ust; break;
        case 3: deger = giris[i] + ((sol + ust) >> 1); break;
        case 4: {
          const tahmin = sol + ust - solUst;
          const ds = Math.abs(tahmin - sol);
          const du = Math.abs(tahmin - ust);
          const dsu = Math.abs(tahmin - solUst);
          deger = giris[i] + (ds <= du && ds <= dsu ? sol : du <= dsu ? ust : solUst);
          break;
        }
        default: throw new Error(`${yol}: bilinmeyen satır süzgeci ${suzgec}`);
      }
      bu[i] = deger & 0xff;
    }
    cikti.set(bu, y * satir);
    onceki = bu;
  }
  return { w, h, pikseller: cikti };
}

function piksel({ w, pikseller }: Png, x: number, y: number) {
  const i = (y * w + x) * 3;
  return { r: pikseller[i], g: pikseller[i + 1], b: pikseller[i + 2] };
}

const morMu = (p: { r: number; g: number; b: number }) =>
  Math.abs(p.r - MOR.r) <= TOLERANS && Math.abs(p.g - MOR.g) <= TOLERANS && Math.abs(p.b - MOR.b) <= TOLERANS;

/** Zemin = dört köşe. Logo ortada olduğu için köşeler her zaman zemin. */
function koseler(png: Png) {
  const { w, h } = png;
  return [piksel(png, 2, 2), piksel(png, w - 3, 2), piksel(png, 2, h - 3), piksel(png, w - 3, h - 3)];
}

const IOS_SIMGE = 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png';
const SPLASHLER = [
  'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png',
  'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png',
  'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png',
  'android/app/src/main/res/drawable/splash.png',
  'android/app/src/main/res/drawable-port-xxxhdpi/splash.png',
  'android/app/src/main/res/drawable-land-xxxhdpi/splash.png',
];

describe('uygulama simgesi ve açılış ekranı', () => {
  it('iOS simgesi Apple şartlarına uyuyor: 1024x1024, alfasız', () => {
    // pngOku alfalı/paletli dosyada fırlatıyor — şartın kendisi orada.
    const png = pngOku(resolve(KOK, IOS_SIMGE));
    expect([png.w, png.h]).toEqual([1024, 1024]);
  });

  it('iOS simgesi Capacitor şablonu DEĞİL (Guideline 2.3.8)', () => {
    const png = pngOku(resolve(KOK, IOS_SIMGE));
    for (const k of koseler(png)) {
      expect(morMu(k), `köşe rgb(${k.r},${k.g},${k.b}) marka moru değil — şablon simge mi?`).toBe(true);
    }
  });

  it.each(SPLASHLER)('%s açılış ekranı bizim', (yol) => {
    const png = pngOku(resolve(KOK, yol));
    for (const k of koseler(png)) {
      expect(morMu(k), `köşe rgb(${k.r},${k.g},${k.b}) marka moru değil — şablon splash mı?`).toBe(true);
    }
  });
});
