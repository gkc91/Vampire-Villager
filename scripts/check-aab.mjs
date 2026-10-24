#!/usr/bin/env node
/**
 * R8 sonrası paket denetimi — eklentiler hâlâ pakette mi?
 *
 * NEDEN VAR: 24 Ekim 2026'da `minifyEnabled true` açıldı (Play Console'un
 * "uygulamanız optimize edilmemiş" önerisi). R8'in bozduğu şey DERLEMEDE
 * görünmüyor: paket üretilir, uygulama açılır, yalnız yansımayla bulunan
 * bir eklenti ortadan kaybolur. Reklam gelmez ya da satın alma başlamaz —
 * hata yok, log yok. Bu projedeki sessiz arızaların tam örüntüsü.
 *
 * Burada .aab'nin İÇİNE bakılıyor:
 *   - `capacitor.plugins.json`daki her sınıf dex'te duruyor mu,
 *   - simge ve açılış ekranı `shrinkResources`a kurban gitmiş mi.
 *
 * Kullanım:  node scripts/check-aab.mjs [aab-yolu]
 * Sürüm betiği bunu `bundleRelease`den hemen sonra çağırıyor.
 */
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const AAB =
  process.argv[2] ?? 'android/app/build/outputs/bundle/release/app-release.aab';

/* ---------------------------------------------------------------- zip ---- */

/**
 * .aab bir ZIP. Node'da yerleşik zip okuyucu yok ve bu denetim için bir
 * bağımlılık eklemeye değmez (birinci prensip: sıfır maliyet, az bağımlılık).
 * Merkezi dizin yeterli: dosya adı, sıkıştırma yöntemi ve yerel başlık
 * konumu.
 */
function zipGirdileri(buf) {
  // EOCD'yi sondan ara. Yorum alanı en fazla 64 KiB olabiliyor.
  const EOCD = 0x06054b50;
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
    if (buf.readUInt32LE(i) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error(`${AAB}: ZIP sonu (EOCD) bulunamadı — dosya bozuk mu?`);

  const adet = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const girdiler = new Map();

  for (let n = 0; n < adet; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) {
      throw new Error('ZIP merkezi dizini beklenen yerde değil');
    }
    const yontem = buf.readUInt16LE(p + 10);
    const sikistirilmis = buf.readUInt32LE(p + 20);
    const adUzunluk = buf.readUInt16LE(p + 28);
    const ekUzunluk = buf.readUInt16LE(p + 30);
    const yorumUzunluk = buf.readUInt16LE(p + 32);
    const yerel = buf.readUInt32LE(p + 42);
    const ad = buf.toString('utf8', p + 46, p + 46 + adUzunluk);
    girdiler.set(ad, { yontem, sikistirilmis, yerel });
    p += 46 + adUzunluk + ekUzunluk + yorumUzunluk;
  }
  return girdiler;
}

function girdiOku(buf, girdi) {
  // Yerel başlıktaki ad/ek uzunlukları merkezi dizindekinden FARKLI
  // olabiliyor; veri konumu buradan hesaplanmalı.
  const { yerel, yontem, sikistirilmis } = girdi;
  if (buf.readUInt32LE(yerel) !== 0x04034b50) throw new Error('yerel ZIP başlığı bozuk');
  const adUzunluk = buf.readUInt16LE(yerel + 26);
  const ekUzunluk = buf.readUInt16LE(yerel + 28);
  const bas = yerel + 30 + adUzunluk + ekUzunluk;
  const ham = buf.subarray(bas, bas + sikistirilmis);
  return yontem === 0 ? ham : inflateRawSync(ham);
}

/* ------------------------------------------------------------- denetim ---- */

const hatalar = [];
const buf = readFileSync(AAB);
const girdiler = zipGirdileri(buf);

// 1. Eklenti listesi paketin kendisinden okunuyor — kaynaktan değil.
//    Böylece yeni bir eklenti eklendiğinde bu denetim kendiliğinden kapsıyor.
const listeYolu = [...girdiler.keys()].find((a) => a.endsWith('assets/capacitor.plugins.json'));
if (!listeYolu) {
  hatalar.push('capacitor.plugins.json pakette YOK — eklenti kaydı hiç gitmemiş.');
}

const siniflar = listeYolu
  ? JSON.parse(girdiOku(buf, girdiler.get(listeYolu)).toString('utf8')).map((e) => e.classpath)
  : [];

// MainActivity listede olmaz ama olmadan uygulama hiç açılmaz.
//
// `com.getcapacitor.Bridge` BİLEREK aranmıyor: iç sınıf, JS onu adıyla
// çağırmıyor ve R8 onu yeniden adlandırıyor — ilk denemede bu denetimi
// düşüren şey buydu, gerçek bir arıza değildi.
siniflar.push('com.lampwickgames.biteclub.MainActivity');

// 2. Dex'lerde sınıf tanımlayıcılarını ara.
//    Dex dosyası sınıf adlarını "Lcom/paket/Sinif;" biçiminde düz metin
//    tutuyor; dex'i ayrıştırmaya gerek yok, baytlarda aramak yetiyor.
const dexAdlari = [...girdiler.keys()].filter((a) => /\/dex\/.*\.dex$/.test(a));
if (dexAdlari.length === 0) hatalar.push('pakette hiç dex yok');

const dexler = dexAdlari.map((a) => girdiOku(buf, girdiler.get(a)));
const dexIcinde = (sinif) => {
  const tanim = Buffer.from(`L${sinif.replace(/\./g, '/')};`, 'utf8');
  return dexler.some((d) => d.includes(tanim));
};

for (const sinif of siniflar) {
  if (!dexIcinde(sinif)) {
    hatalar.push(`SINIF YOK: ${sinif} — R8 attı. Eklenti sessizce çalışmaz.`);
  }
}

// 3. JS'in ADIYLA çağırdığı eklenti metotları duruyor mu?
//
//    Sınıfın kalması yetmiyor: Capacitor metodu da adıyla buluyor. R8 bir
//    metodu yeniden adlandırırsa sınıf pakette görünür, çağrı sessizce
//    "yok böyle bir metot" diye düşer. Aşağıdakiler PARA YOLLARI —
//    kaybolduklarında reklam gelmez ya da satın alma hiç başlamaz ve
//    kullanıcı yalnız "bir şeyler olmadı" görür.
//
//    Liste src/monetization/adGate.ts ve billing.ts'teki çağrıları
//    yansıtıyor; oraya yeni bir çağrı eklenirse buraya da eklenmeli.
const METOTLAR = [
  // Reklamlar
  'prepareInterstitial',
  'showInterstitial',
  'prepareRewardVideoAd',
  'showRewardVideoAd',
  'requestConsentInfo',
  'showConsentForm',
  // Satın alma
  'getProducts',
  'getPurchases',
  'isBillingSupported',
  'purchaseProduct',
];

for (const metot of METOTLAR) {
  // Dex metot adlarını da düz metin tutuyor.
  const ad = Buffer.from(metot, 'utf8');
  if (!dexler.some((d) => d.includes(ad))) {
    hatalar.push(`METOT YOK: ${metot}() — R8 yeniden adlandırdı. Çağrı sessizce düşer.`);
  }
}

// 4. shrinkResources simgeyi ya da açılış ekranını yemiş olmasın.
//    (Apple 2.3.8 reddi simge yüzündendi; aynı hatayı R8 eliyle tekrarlamayalım.)
const kaynakVar = (desen) => [...girdiler.keys()].some((a) => desen.test(a));
if (!kaynakVar(/\/res\/.*splash.*\.(png|webp|xml)$/i)) {
  hatalar.push('açılış ekranı kaynağı pakette yok — shrinkResources atmış olabilir.');
}
if (!kaynakVar(/\/res\/mipmap.*ic_launcher.*\.(png|webp|xml)$/i)) {
  hatalar.push('uygulama simgesi pakette yok — shrinkResources atmış olabilir.');
}

/* --------------------------------------------------------------- sonuc ---- */

if (hatalar.length) {
  console.error(`\nPAKET DENETİMİ DÜŞTÜ (${AAB}):\n`);
  for (const h of hatalar) console.error(`  - ${h}`);
  console.error(
    '\nR8 bir şeyi attıysa android/app/proguard-rules.pro içine keep kuralı\n' +
      'eklemeden ÖNCE kütüphanenin kendi consumerProguardFiles kuralını\n' +
      'getirip getirmediğine bak.\n',
  );
  process.exit(1);
}

console.log(
  `paket: ${dexAdlari.length} dex, ${siniflar.length} sınıf ve ${METOTLAR.length} metot ` +
    'yerinde, simge ve açılış ekranı duruyor.',
);
