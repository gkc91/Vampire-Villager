import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Uygulamanın aktarıcıyı bulabilmesi.
 *
 * Gerçek cihazda çıktı (16 Eylül 2026): kullanıcı Android uygulamasından
 * oda kurdu, eşi tarayıcıdan katılamadı. Teşhis panelleri sebebi
 * gösteriyordu — uygulamada "Aktarıcı: —, Taşıma: p2p", webde "Taşıma:
 * relay". İki farklı taşıma katmanı; aynı sürümde olsalar bile
 * birbirlerini göremezler.
 *
 * Sebebi `relayBaseUrl()`in yerel geliştirme koruması: `localhost`
 * gördüğünde null dönüyordu. Capacitor WebView'inin origin'i ZATEN
 * `https://localhost`, yani uygulama kendini yerel geliştirme sanıp
 * aktarıcıyı hiç aramıyordu. Android sürümü bugüne kadar aktarıcıyı hiç
 * kullanmamış.
 *
 * `joinLink()` aynı tuzağa daha önce düşmüş ve çözümü bulmuştu:
 * uygulamada `VITE_PUBLIC_URL` kullanılır.
 */

async function yukle(opts: { native: boolean; publicUrl?: string; relayUrl?: string }) {
  vi.resetModules();
  vi.stubEnv('VITE_PUBLIC_URL', opts.publicUrl ?? '');
  vi.stubEnv('VITE_RELAY_URL', opts.relayUrl ?? '');
  vi.doMock('../util/platform', () => ({ isNativeApp: () => opts.native }));
  return import('./RelayAdapter');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.doUnmock('../util/platform');
});

describe('aktarıcı adresi', () => {
  it('uygulamada yayındaki adresi kullanır — localhost tuzağına düşmez', async () => {
    const m = await yukle({ native: true, publicUrl: 'https://biteclub.lampwickgames.com' });
    expect(m.relayBaseUrl()).toBe('wss://biteclub.lampwickgames.com');
    expect(m.isRelayAvailable(), 'uygulama relay modunda').toBe(true);
  });

  it('sondaki eğik çizgi temizlenir', async () => {
    const m = await yukle({ native: true, publicUrl: 'https://biteclub.lampwickgames.com/' });
    expect(m.relayBaseUrl()).toBe('wss://biteclub.lampwickgames.com');
  });

  it('açık VITE_RELAY_URL her şeyi ezer', async () => {
    const m = await yukle({
      native: true,
      publicUrl: 'https://biteclub.lampwickgames.com',
      relayUrl: 'ws://192.168.1.5:8787',
    });
    expect(m.relayBaseUrl()).toBe('ws://192.168.1.5:8787');
  });

  it('uygulamada yayın adresi tanımsızsa P2P yedeğine düşer', async () => {
    const m = await yukle({ native: true });
    expect(m.relayBaseUrl()).toBeNull();
  });

  it('webde davranış değişmedi — node ortamında window yok, null', async () => {
    const m = await yukle({ native: false });
    expect(m.relayBaseUrl()).toBeNull();
  });
});
