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
