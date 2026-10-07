import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * iOS gizlilik manifesti (`ios/App/App/PrivacyInfo.xcprivacy`).
 *
 * NEDEN TEST VAR: Bu dosyadaki bir tutarsızlık yerelde hiçbir şeyi
 * bozmuyor — derleme geçiyor, TestFlight'a yükleniyor, uygulama
 * çalışıyor. Hata ancak incelemeye gönderildikten sonra Apple'dan
 * e-postayla dönüyor (ITMS-91064, 2.2'nin ilk gönderimi) ve yeni bir
 * derleme gerektiriyor. Yakalanabileceği tek yer burası.
 *
 * Apple'ın kuralı: `NSPrivacyTracking` true ise `NSPrivacyTrackingDomains`
 * dolu olmalı, liste doluysa bayrak true olmalı. Biz ikisini de
 * yazmıyoruz (dosyadaki yoruma bakın); izleme veri türü düzeyinde.
 */

const yol = resolve(__dirname, '../../ios/App/App/PrivacyInfo.xcprivacy');
// Yorumlar atılıyor: içlerinde anahtar adları geçiyor, sayılmasınlar.
const xml = readFileSync(yol, 'utf-8').replace(/<!--[\s\S]*?-->/g, '');

function izlemeBayragi(): boolean | undefined {
  const m = xml.match(/<key>NSPrivacyTracking<\/key>\s*<(true|false)\s*\/>/);
  return m ? m[1] === 'true' : undefined;
}

function izlemeAlanAdlari(): string[] | undefined {
  const m = xml.match(/<key>NSPrivacyTrackingDomains<\/key>\s*(<array\s*\/>|<array>([\s\S]*?)<\/array>)/);
  if (!m) return undefined;
  return [...(m[2] ?? '').matchAll(/<string>([^<]*)<\/string>/g)].map((x) => x[1]);
}

describe('iOS gizlilik manifesti', () => {
  it('izleme bayrağı ile alan adı listesi Apple kuralına uyuyor (ITMS-91064)', () => {
    const bayrak = izlemeBayragi() ?? false;
    const alanlar = izlemeAlanAdlari() ?? [];

    if (bayrak) {
      expect(alanlar.length, 'NSPrivacyTracking true iken alan adı listesi boş olamaz').toBeGreaterThan(0);
    }
    if (alanlar.length > 0) {
      expect(bayrak, 'alan adı listesi doluyken NSPrivacyTracking true olmalı').toBe(true);
    }
  });

  it('reklam kimliği hâlâ izleme amaçlı beyan ediliyor', () => {
    // Mağazadaki gizlilik etiketi "Used to Track You" diyor ve ATT izni
    // isteniyor. Manifest bunu veri türü düzeyinde söylemeye devam
    // etmeli; üst düzey bayrağı kaldırmak beyanı geri almak değil.
    const girdi = xml.match(
      /<string>NSPrivacyCollectedDataTypeDeviceID<\/string>[\s\S]*?<key>NSPrivacyCollectedDataTypeTracking<\/key>\s*<(true|false)\s*\/>/,
    );
    expect(girdi, 'DeviceID girdisi yok').not.toBeNull();
    expect(girdi![1]).toBe('true');
  });
});
