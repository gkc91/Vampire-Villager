import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AASA, APP_ADS_TXT, ASSETLINKS, wellKnownResponse } from './index';

/**
 * Derin link doğrulama dosyaları.
 *
 * NEDEN TEST VAR: bu dosyalar olmadan ya da içerikleri uygulamayla
 * uyuşmadığında hiçbir şey hata vermiyor. Android ve iOS sessizce tarayıcıya
 * düşüyor; kullanıcı "link uygulamayı açmıyor" diyor, log yok, kilitlenme
 * yok. Gerçek arıza (15 Ekim 2026): WhatsApp'tan paylaşılan davet
 * bağlantısı hem Android'de hem iOS'ta siteyi açıyordu.
 *
 * Sessiz bozulma yolları ve her birinin bekçisi:
 *   - dosya hiç servis edilmiyor → `not_found_handling: single-page-application`
 *     yüzünden 200 + index.html dönüyordu; içerik türü testi yakalıyor
 *   - parmak izi/paket adı manifest'le uyuşmuyor → karşılaştırma testleri
 *   - sahiplenilen yol genişletilip `/*` yapılıyor → ana sayfa da uygulamaya
 *     gider; kapsam testi yakalıyor
 */

const KOK = resolve(__dirname, '..');
const manifest = readFileSync(resolve(KOK, 'android/app/src/main/AndroidManifest.xml'), 'utf-8');
const entitlements = readFileSync(resolve(KOK, 'ios/App/App/App.entitlements'), 'utf-8');

const ALAN = 'biteclub.lampwickgames.com';

describe('derin link doğrulama dosyaları', () => {
  it.each([
    '/.well-known/assetlinks.json',
    '/.well-known/apple-app-site-association',
    '/apple-app-site-association',
  ])('%s JSON olarak servis ediliyor', async (yol) => {
    const r = wellKnownResponse(yol);
    expect(r, 'dosya servis edilmiyor — SPA yedeği index.html döndürür').not.toBeNull();
    // İçerik türü ŞART: Apple application/json bekliyor, text/html'i reddediyor.
    expect(r!.headers.get('content-type')).toBe('application/json');
    await expect(r!.json()).resolves.toBeTruthy();
  });

  it('sahiplenilmeyen yolda null döndürüyor (statik siteye düşsün)', () => {
    expect(wellKnownResponse('/')).toBeNull();
    expect(wellKnownResponse('/privacy.html')).toBeNull();
  });
});

describe('Android App Links', () => {
  it('manifest alan adını ve /join yolunu sahipleniyor', () => {
    expect(manifest).toContain('android:autoVerify="true"');
    expect(manifest).toContain(`android:host="${ALAN}"`);
    expect(manifest).toContain('android:pathPrefix="/join"');
  });

  it('assetlinks paket adı manifest ile aynı', () => {
    const paket = ASSETLINKS[0].target.package_name;
    // Manifest'te paket adı yok (Gradle'dan geliyor) — applicationId ile karşılaştır.
    const gradle = readFileSync(resolve(KOK, 'android/app/build.gradle'), 'utf-8');
    expect(gradle).toContain(`applicationId "${paket}"`);
  });

  it('Play App Signing için İKİ parmak izi de var', () => {
    const izler = ASSETLINKS[0].target.sha256_cert_fingerprints;
    // Yalnız uygulama imzalama anahtarı yazılırsa elle kurulan APK'da
    // (yükleme anahtarıyla imzalı) derin link sessizce çalışmaz.
    expect(izler).toHaveLength(2);
    for (const iz of izler) {
      expect(iz, `parmak izi biçimi bozuk: ${iz}`).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
    }
  });
});

describe('iOS Universal Links', () => {
  it('entitlements alan adını sahipleniyor', () => {
    expect(entitlements).toContain('com.apple.developer.associated-domains');
    expect(entitlements).toContain(`applinks:${ALAN}`);
  });

  it('AASA uygulama kimliği takım kimliği + paket adı biçiminde', () => {
    const [appId] = AASA.applinks.details[0].appIDs;
    expect(appId).toMatch(/^[A-Z0-9]{10}\.com\.lampwickgames\.biteclub$/);
  });

  it('YALNIZ /join/* sahipleniliyor', () => {
    const bilesenler = AASA.applinks.details[0].components;
    expect(bilesenler).toHaveLength(1);
    expect(bilesenler[0]['/']).toBe('/join/*');
    // `*` ya da `/` sahiplenmek ana sayfayı, gizlilik ve nasıl oynanır
    // sayfalarını da uygulamaya yönlendirirdi.
    expect(bilesenler[0]['/']).not.toBe('*');
  });
});

/**
 * AdMob app-ads.txt.
 *
 * NEDEN TEST VAR: dosya İKİ yerde durmak zorunda, çünkü AdMob onu mağaza
 * girişindeki geliştirici alan adının kökünde arıyor ve iki mağaza iki
 * ayrı alan gösteriyor — Play lampwickgames.com, App Store
 * biteclub.lampwickgames.com.
 *
 * Gerçek arıza (24 Ekim 2026): iOS uygulaması AdMob'a bağlanırken
 * doğrulama düştü. Dosya "yok" değildi; `/app-ads.txt` isteğine SPA yedeği
 * 200 + index.html döndürüyordu. AdMob da "bilgileriniz eşleşmiyor" dedi.
 * Yetkilendirme olmadan envanter yetkisiz sayılıyor ve reklam doluluğu
 * düşüyor — yine sessiz, yine logsuz.
 */
describe('AdMob app-ads.txt', () => {
  const YAYINCI = 'google.com, pub-3566083608754052, DIRECT, f08c47fec0942fa0';

  it('düz metin olarak servis ediliyor (HTML değil)', async () => {
    const r = wellKnownResponse('/app-ads.txt');
    expect(r, 'servis edilmiyor — SPA yedeği index.html döndürür').not.toBeNull();
    // İçerik türü ŞART: AdMob text/html'i geçerli saymıyor.
    expect(r!.headers.get('content-type')).toMatch(/^text\/plain/);
    await expect(r!.text()).resolves.toContain(YAYINCI);
  });

  it('stüdyo sitesindeki kopya AYNI yayıncı satırını taşıyor', () => {
    const studyo = readFileSync(resolve(KOK, 'site/public/app-ads.txt'), 'utf-8');
    // İki kopya ayrışırsa bir mağazadaki envanter sessizce yetkisiz kalır.
    expect(studyo).toContain(YAYINCI);
    expect(APP_ADS_TXT).toContain(YAYINCI);
  });

  it('yayıncı kimliği reklam birimleriyle aynı hesaptan', () => {
    // Birim kimlikleri ca-app-pub-3566083608754052/... biçiminde; yayıncı
    // numarası tutmazsa AdMob dosyayı başka bir hesabın sanıyor.
    expect(APP_ADS_TXT).toContain('pub-3566083608754052');
  });
});
