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
let demo = false;
const canli = new Set();
for (const file of readdirSync(dir).filter((f) => f.endsWith('.js'))) {
  const text = readFileSync(join(dir, file), 'utf8');
  for (const [, yayinci] of text.matchAll(/ca-app-pub-(\d{10,})/g)) {
    if (`ca-app-pub-${yayinci}` === DEMO_YAYINCI) demo = true;
    else canli.add(`ca-app-pub-${yayinci}`);
  }
}

if (canli.size > 0 && !demo) {
  console.log(`reklamlar: CANLI (${[...canli].join(', ')}) — üretim sürümü.`);
} else if (canli.size > 0 && demo) {
  console.log('reklamlar: KARIŞIK — biri canlı biri demo. .env.production eksik.');
} else {
  console.log('reklamlar: DEMO — üretime çıkarken .env.production doldurulmalı.');
}
