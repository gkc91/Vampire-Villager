import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Davet bağlantısının BİÇİMİ.
 *
 * NEDEN TEST VAR: bağlantı eskiden `.../#/join/KOD` idi ve WhatsApp'tan
 * gelen davet hem Android'de hem iOS'ta tarayıcıyı açıyordu. Sebep biçimdi:
 * App Links ve Universal Links eşleşmeyi YOL üzerinden yapıyor, `#` sonrası
 * yolun parçası değil — `/#/join/KOD` adresinin yolu sadece `/`.
 *
 * Hash'e geri dönmek hiçbir testi bozmaz, hiçbir hata vermez; yalnız derin
 * link sessizce ölür. Bu test onu yakalıyor.
 */

const PUBLIC_URL = 'https://biteclub.lampwickgames.com';

/**
 * Test ortamı Node (vite.config.ts). Yalnız `window.location` gerekiyor;
 * bunun için jsdom bağımlılığı eklemek yerine adresi burada taklit ediyoruz.
 */
function adres(href: string) {
  const u = new URL(href);
  (globalThis as unknown as { window: unknown }).window = {
    location: { origin: u.origin, pathname: u.pathname, hash: u.hash },
  };
}

beforeEach(() => adres(`${PUBLIC_URL}/`));

async function yukle(native: boolean, publicUrl = PUBLIC_URL) {
  vi.resetModules();
  vi.doMock('@capacitor/core', () => ({
    Capacitor: { isNativePlatform: () => native, getPlatform: () => (native ? 'ios' : 'web') },
  }));
  vi.stubEnv('VITE_PUBLIC_URL', publicUrl);
  return import('./identity');
}

afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.doUnmock('@capacitor/core');
});

describe('davet bağlantısı', () => {
  it('uygulamada yayındaki adresi ve /join/KOD yolunu üretiyor', async () => {
    const { joinLink } = await yukle(true);

    expect(joinLink('ABC123')).toBe(`${PUBLIC_URL}/join/ABC123`);
  });

  it('webde sayfanın kendi origin\'ini kullanıyor', async () => {
    const { joinLink } = await yukle(false);

    expect(joinLink('ABC123')).toBe(`${PUBLIC_URL}/join/ABC123`);
  });

  it('HASH KULLANMIYOR — App Links yolu eşleştiriyor', async () => {
    const { joinLink } = await yukle(true);
    const link = joinLink('ABC123');

    expect(link, 'hash döndü: derin link sessizce tarayıcıya düşer').not.toContain('#');
    expect(new URL(link).pathname).toBe('/join/ABC123');
  });

  it('yayındaki adresin sonundaki eğik çizgi çift yol yapmıyor', async () => {
    const { joinLink } = await yukle(true, `${PUBLIC_URL}/`);

    expect(joinLink('ABC123')).toBe(`${PUBLIC_URL}/join/ABC123`);
  });
});

describe('bağlantıdan oda kodu okuma', () => {
  it('yoldan okuyor (uygulama kurulu değilken tarayıcıda açılan hal)', async () => {
    const { roomFromLocation } = await yukle(false);
    adres(`${PUBLIC_URL}/join/abc123`);

    expect(roomFromLocation()).toBe('ABC123');
  });

  it('eski hash biçimi de çalışmaya devam ediyor', async () => {
    const { roomFromLocation } = await yukle(false);
    adres(`${PUBLIC_URL}/#/join/XYZ789`);

    expect(roomFromLocation()).toBe('XYZ789');
  });
});
