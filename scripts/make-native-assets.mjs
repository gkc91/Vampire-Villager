/**
 * Uygulama simgesi ve açılış ekranını `public/assets/icon/app-icon.png`'den
 * üretir — iOS ve Android için.
 *
 * NEDEN VAR: `npx cap add ios/android` platform klasörlerini Capacitor'ın
 * KENDİ ŞABLON GÖRSELLERİYLE kuruyor (beyaz zeminde mavi bir işaret). Bunlar
 * hiçbir şeyi bozmuyor, derleme geçiyor, uygulama çalışıyor — ama mağazaya
 * o haliyle gidiyor. iOS 2.2 incelemesi tam bundan düştü:
 *
 *   Guideline 2.3.8 — "the app icons appear to be placeholder icons"
 *
 * Android'de de aynısı yayına çıkmıştı: açılış ekranı Capacitor'ın işareti.
 *
 * Kullanım:  node scripts/make-native-assets.mjs
 * Gerektirir: ffmpeg (yalnız bu betik için; derleme zinciri kullanmıyor).
 *
 * Simge değişirse bunu tekrar çalıştır, sonra `npm test` ile doğrula.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const KAYNAK = 'public/assets/icon/app-icon.png';

// Simgenin kendi arka plan rengi. Açılış ekranının zemini de bu: simge
// karesi zemine oturduğunda ek yeri görünmüyor, logo havada duruyormuş gibi
// oluyor. Değeri kaynaktan ölçüldü (#461B83), Android'in
// ic_launcher_background.xml'indeki #471A83 ile aynı mor.
const ZEMIN = '0x461B83';

const IOS_SIMGE = 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png';
const IOS_SPLASH = 'ios/App/App/Assets.xcassets/Splash.imageset';
const AND_RES = 'android/app/src/main/res';

const ff = (...args) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...args]);

/** Apple: 1024x1024, alfa YOK. Alfa varsa yükleme reddediliyor. */
function iosSimge() {
  mkdirSync(dirname(IOS_SIMGE), { recursive: true });
  ff('-i', KAYNAK, '-vf', 'scale=1024:1024:flags=lanczos,format=rgb24', '-pix_fmt', 'rgb24', IOS_SIMGE);
  console.log('iOS simge   1024x1024');
}

/**
 * Açılış ekranı: zemin + ortada logo.
 *
 * Logo kısa kenarın %38'i. Daha büyüğü iPad'de dev duruyor; iOS storyboard
 * `scaleAspectFill` kullandığı için kare görsel her ekranda kırpılarak
 * doldurulur, logo ortada kaldığı sürece kırpma zarar vermez.
 */
function splash(cikti, w, h) {
  const logo = Math.round(Math.min(w, h) * 0.38);
  mkdirSync(dirname(cikti), { recursive: true });
  ff(
    '-f', 'lavfi', '-i', `color=c=${ZEMIN}:s=${w}x${h}`,
    '-i', KAYNAK,
    '-filter_complex',
    `[1]scale=${logo}:${logo}:flags=lanczos[l];[0][l]overlay=(W-w)/2:(H-h)/2,format=rgb24`,
    '-frames:v', '1', '-pix_fmt', 'rgb24', cikti,
  );
}

function olc(p) {
  // PNG başlığı: 16. bayttan itibaren genişlik ve yükseklik (big-endian).
  const d = readFileSync(p);
  return [d.readUInt32BE(16), d.readUInt32BE(20)];
}

iosSimge();

// iOS: tek kare görsel, üç dosya adıyla (Capacitor'ın Contents.json'ı
// 1x/2x/3x için aynı ölçüyü istiyor).
for (const ad of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
  splash(join(IOS_SPLASH, ad), 2732, 2732);
}
console.log('iOS splash  2732x2732 x3');

// Android: var olan dosyaların ölçüleri korunuyor — hangi yoğunluk/yön
// klasörlerinin gerektiğini Capacitor belirledi, listeyi burada
// tekrarlamıyoruz.
const androidSplash = [
  'drawable', 'drawable-land-mdpi', 'drawable-land-hdpi', 'drawable-land-xhdpi',
  'drawable-land-xxhdpi', 'drawable-land-xxxhdpi', 'drawable-port-mdpi',
  'drawable-port-hdpi', 'drawable-port-xhdpi', 'drawable-port-xxhdpi',
  'drawable-port-xxxhdpi',
].map((d) => join(AND_RES, d, 'splash.png'));

for (const p of androidSplash) {
  const [w, h] = olc(p);
  splash(p, w, h);
}
console.log(`Android splash  ${androidSplash.length} dosya`);
