#!/usr/bin/env node
/**
 * Tek komutla sürüm: web ve uygulama AYNI COMMIT'ten çıkar.
 *
 * NEDEN VAR: 16 Eylül 2026'da şu oldu — Android paketi `44d2212`'den,
 * yayındaki site `d5d990f`'ten derlenmişti. İki ayrı anda, iki ayrı
 * commit'ten. Aradaki fark oyunun çalışmamasına kadar gitti.
 *
 * Buradaki tek garanti şu: bu betik çalıştığında çalışma ağacı temizdir
 * ve iki çıktı da aynı commit'i taşır. Sürümleri "unutmamaya" değil,
 * unutmanın imkânsız olmasına dayanıyor.
 *
 * Kullanıcının telefonundaki sürüm yine de eski olabilir — Play
 * güncellemesi kullanıcının elinde. Onu `PROTOCOL_VERSION` koruyor; bu
 * betik YAYINLANAN iki tarafın ayrışmasını engelliyor.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const calistir = (cmd, opts = {}) =>
  execSync(cmd, { stdio: 'inherit', encoding: 'utf8', ...opts });
const oku = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

function dur(mesaj) {
  console.error(`\nSÜRÜM DURDURULDU: ${mesaj}\n`);
  process.exit(1);
}

// 1. Çalışma ağacı temiz mi? Kirliyse iki çıktı aynı kaynaktan çıkmaz.
const kirli = oku('git status --porcelain').replace(/^.*tsbuildinfo.*$/gm, '').trim();
if (kirli) {
  dur(
    'çalışma ağacında commit edilmemiş değişiklik var:\n' +
      kirli +
      '\n\nÖnce commit et. Web ve uygulama aynı commit\'ten çıkmalı.',
  );
}

const commit = oku('git rev-parse --short HEAD');
const tarih = oku('git log -1 --format=%cd --date=format:%Y-%m-%d %H:%M');
console.log(`\n=== Sürüm: ${commit} (${tarih}) ===\n`);

// 2. Kapı: testler, i18n taraması, derleme, paket denetimi.
calistir('npm run check');

// 3. Web — Cloudflare Workers.
console.log('\n--- Web yayınlanıyor ---');
calistir('npx wrangler deploy');

// 4. Uygulama — aynı dist/ klasöründen.
console.log('\n--- Android paketi derleniyor ---');
calistir('npx cap sync android');

const jdk = process.env.JAVA_HOME ?? 'C:/Users/user/Java/jdk-21.0.12.1+1';
if (!existsSync(jdk)) dur(`JDK bulunamadı: ${jdk}. JAVA_HOME ayarla.`);
calistir('gradlew bundleRelease', {
  cwd: 'android',
  env: { ...process.env, JAVA_HOME: jdk },
  shell: true,
});

console.log(`
=== Bitti ===

Her ikisi de ${commit} commit'inden:
  web  → https://biteclub.lampwickgames.com
  uygulama → android/app/build/outputs/bundle/release/app-release.aab

Telefonda ayarlar → Bağlantı bilgisi'ndeki "Sürüm" satırı web ile
aynı hash'i göstermeli. Göstermiyorsa biri eski.
`);
