import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Üretim paketinde yerel geliştirme adresi olmamalı.
 *
 * Bir kez oldu: `.env` içindeki ws://localhost:8787 pakete gömüldü, yayındaki
 * oyunda hiç kimse bağlanamadı ve sorun ancak elde paket okunarak bulundu.
 * Bir daha sessizce yayına çıkmasın.
 */
const dir = 'dist/assets';
const banned = [/ws:\/\/localhost/, /wss:\/\/localhost/, /http:\/\/localhost:\d+/, /127\.0\.0\.1:\d+/];

let bad = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith('.js'))) {
  const text = readFileSync(join(dir, file), 'utf8');
  for (const rule of banned) {
    const hit = text.match(rule);
    if (hit) bad.push(`${file}: ${hit[0]}`);
  }
}

if (bad.length) {
  console.error('HATA: üretim paketinde yerel adres var:');
  for (const line of bad) console.error('  ' + line);
  console.error('.env.production dosyasını kontrol et (yereldeki .env ezilmeli).');
  process.exit(1);
}
console.log('paket: yerel adres yok.');

/**
 * Reklam kimlikleri demo mu, canlı mı? Bunu HER derlemede yüksek sesle
 * söylüyoruz.
 *
 * Ayak kayacak yer şurası: kapalı teste bilerek demo kimliklerle
 * çıkıyoruz (kendi reklamına tıklamak AdMob'da hesap kapattırıyor). Play'in
 * olağan akışı ise kapalı test sürümünü üretime "yükseltmek". O yolla
 * gidilirse yayındaki oyun demo reklam gösterir ve tek kuruş kazanmaz —
 * hiçbir yerde hata da vermez. Bu satır o sessizliği bozuyor.
 */
const DEMO_YAYINCI = 'ca-app-pub-3940256099942544';

// Demo kimlikleri HER pakette var: `adUnits.ts` onları yedek değer olarak
// kaynağa gömüyor. Bu yüzden "demo dizesi var mı" diye bakmak işe yaramaz —
// ilk yazdığımda öyle yapmıştım ve denetçi doğru üretim paketini
// "KARIŞIK" diye işaretledi, "CANLI" sonucuna hiç ulaşamıyordu.
//
// Doğru ölçüt: DEMO OLMAYAN kaç ayrı reklam birimi gömülü. İki birim
// kullanıyoruz (geçiş + ödüllü), ikisi de varsa ortam değişkenleri
// okunmuş demektir.
const canliBirimler = new Set();
for (const file of readdirSync(dir).filter((f) => f.endsWith('.js'))) {
  const text = readFileSync(join(dir, file), 'utf8');
  for (const [tam, yayinci] of text.matchAll(/ca-app-pub-(\d{10,})\/(\d+)/g)) {
    if (`ca-app-pub-${yayinci}` !== DEMO_YAYINCI) canliBirimler.add(tam);
  }
}

const BEKLENEN_BIRIM = 2; // geçiş + ödüllü
if (canliBirimler.size >= BEKLENEN_BIRIM) {
  console.log(`reklamlar: CANLI (${canliBirimler.size} birim) — üretim sürümü.`);
} else if (canliBirimler.size > 0) {
  console.log(
    `reklamlar: KARIŞIK — ${canliBirimler.size}/${BEKLENEN_BIRIM} birim canlı. ` +
      '.env.production.local eksik.',
  );
} else {
  console.log('reklamlar: DEMO — üretime çıkarken .env.production.local doldurulmalı.');
}
