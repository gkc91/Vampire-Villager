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
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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
// Tırnak ŞART: format dizesindeki boşluk olmadan git `%H:%M`'i ayrı bir
// argüman — bir revizyon adı — sanıyor ve "invalid object name" diyor.
const tarih = oku('git log -1 --format=%cd --date=format:"%Y-%m-%d %H:%M"');
console.log(`\n=== Sürüm: ${commit} (${tarih}) ===\n`);

// 2. Kapı: testler, i18n taraması, derleme, paket denetimi.
calistir('npm run check');

// 3. Web — Cloudflare Workers.
console.log('\n--- Web yayınlanıyor ---');
calistir('npx wrangler deploy');

// 4. Uygulama — aynı dist/ klasöründen.
console.log('\n--- Android paketi derleniyor ---');
calistir('npx cap sync android');

// Proje `source/target 21` ile derleniyor. Bu makinede JAVA_HOME hâlâ
// 17'yi gösteriyor, bu yüzden JAVA_HOME'a körü körüne güvenmek
// "invalid source release: 21" ile bitiyordu. Adayları sırayla deneyip
// sürümünü doğruluyoruz; 21'den küçüğü kabul etmiyoruz.
const jdkSurumu = (yol) => {
  try {
    const m = /^JAVA_VERSION="(\d+)/m.exec(readFileSync(join(yol, 'release'), 'utf8'));
    return m ? Number(m[1]) : 0;
  } catch {
    return 0;
  }
};
const jdkAdaylari = [
  process.env.BITECLUB_JDK,
  'C:/Users/user/Java/jdk-21.0.12.1+1',
  process.env.JAVA_HOME,
].filter(Boolean);
const jdk = jdkAdaylari.find((yol) => existsSync(yol) && jdkSurumu(yol) >= 21);
if (!jdk) {
  dur(
    'JDK 21 veya üstü bulunamadı. Denenen yollar:\n  ' +
      jdkAdaylari.map((y) => `${y} (${jdkSurumu(y) || 'yok/okunamadı'})`).join('\n  ') +
      '\n\nBITECLUB_JDK ortam değişkenine 21+ bir JDK yolu ver.',
  );
}
console.log(`JDK: ${jdk} (${jdkSurumu(jdk)})`);
// Yolu açıkça yaz. Git Bash içinden çalıştırıldığında ortamda
// `NoDefaultCurrentDirectoryInExePath` oluyor; cmd.exe o zaman çalışma
// dizinine bakmıyor ve çıplak `gradlew` "bulunamadı" diyor.
const gradlew = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
calistir(`${gradlew} bundleRelease`, {
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
