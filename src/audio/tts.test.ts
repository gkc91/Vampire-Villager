import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Sesli anlatıcı.
 *
 * İKİ AYRI ARIZA BURADA BEKLENİYOR:
 *
 * 1. DİL. Etiket `lang === 'tr' ? 'tr-TR' : 'en-US'` diye yazılmıştı;
 *    Türkçe dışındaki dokuz dil İngilizce okunuyordu. Almanca oynayan
 *    "Die Nacht beginnt"i İngiliz aksanıyla duyuyordu. Hiçbir yerde hata
 *    vermiyor: ses çıkıyor, uygulama çalışıyor, yalnız yanlış dilde.
 *
 * 2. PLATFORM. Anlatıcı doğrudan Web Speech API'sine bağlıydı ve
 *    Android'in sistem WebView'ı onu uygulamıyor — 25 Ekim 2026 oyun
 *    gecesinde "iOS'ta var, Android'de yok" diye ortaya çıktı. Artık
 *    çağrılar eklentiye gidiyor; bu testler çağrının GERÇEKTEN eklentiye
 *    ve doğru dil etiketiyle gittiğini tutuyor.
 */

const konusulanlar: { text: string; lang: string }[] = [];
let durdurmaSayisi = 0;

vi.mock('@capacitor-community/text-to-speech', () => ({
  TextToSpeech: {
    speak: (o: { text: string; lang: string }) => {
      konusulanlar.push({ text: o.text, lang: o.lang });
      return Promise.resolve();
    },
    stop: () => {
      durdurmaSayisi += 1;
      return Promise.resolve();
    },
  },
  QueueStrategy: { Flush: 0, Add: 1 },
}));

async function yukle(native: boolean) {
  vi.resetModules();
  vi.doMock('../util/platform', () => ({ isNativeApp: () => native }));
  return import('./tts');
}

afterEach(() => {
  konusulanlar.length = 0;
  durdurmaSayisi = 0;
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('konuşma dili etiketi', () => {
  it('her arayüz dili kendi etiketini alıyor', async () => {
    const { KONUSMA_DILI, dilEtiketi } = await yukle(true);

    for (const [dil, etiket] of Object.entries(KONUSMA_DILI)) {
      expect(dilEtiketi(dil)).toBe(etiket);
      // BCP-47 olmalı ve arayüz diliyle başlamalı: "de" → "de-DE".
      expect(etiket).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
      expect(etiket.slice(0, 2)).toBe(dil);
    }
  });

  it('İngilizce DIŞINDAKİ hiçbir dil en-US almıyor', async () => {
    const { KONUSMA_DILI, dilEtiketi } = await yukle(true);

    const digerleri = Object.keys(KONUSMA_DILI).filter((d) => d !== 'en');

    expect(digerleri.map(dilEtiketi)).not.toContain('en-US');
  });

  it('bölgeli kod (en-GB) ve bilinmeyen dil İngilizceye düşüyor', async () => {
    const { dilEtiketi } = await yukle(true);

    expect(dilEtiketi('en-GB')).toBe('en-US');
    expect(dilEtiketi('xx')).toBe('en-US');
  });
});

describe('konuşma', () => {
  it('uygulamada eklentiye gidiyor — Android WebView artık engel değil', async () => {
    const { speak } = await yukle(true);

    speak('gece başlıyor', 'tr');
    await vi.waitFor(() => expect(konusulanlar).toHaveLength(1));

    expect(konusulanlar[0]).toEqual({ text: 'gece başlıyor', lang: 'tr-TR' });
  });

  it('metin eklentiye DOĞRU dil etiketiyle gidiyor', async () => {
    const { speak } = await yukle(true);

    speak('Die Nacht beginnt', 'de');
    await vi.waitFor(() => expect(konusulanlar).toHaveLength(1));

    expect(konusulanlar[0].lang).toBe('de-DE');
  });

  it('boş metin motoru hiç çağırmıyor', async () => {
    const { speak } = await yukle(true);

    speak('', 'tr');
    await new Promise((r) => setTimeout(r, 30));

    expect(konusulanlar).toHaveLength(0);
  });

  it('durdurma eklentiye iletiliyor', async () => {
    const { stopSpeaking } = await yukle(true);

    stopSpeaking();
    await vi.waitFor(() => expect(durdurmaSayisi).toBe(1));
  });
});

describe('destek kontrolü', () => {
  it('uygulamada her zaman destekli — eklenti pakette', async () => {
    const { isTtsSupported } = await yukle(true);
    // Android WebView'da `speechSynthesis` yok; yine de destekli olmalı,
    // eski kod tam burada false dönüp anahtarı gizliyordu.
    vi.stubGlobal('window', {});

    expect(isTtsSupported()).toBe(true);
  });

  it('webde tarayıcıya bakıyor', async () => {
    const { isTtsSupported } = await yukle(false);

    vi.stubGlobal('window', { speechSynthesis: {} });
    expect(isTtsSupported()).toBe(true);

    vi.stubGlobal('window', {});
    expect(isTtsSupported()).toBe(false);
  });

  it('desteklenmeyen webde konuşmayı hiç denemiyor', async () => {
    const { speak } = await yukle(false);
    vi.stubGlobal('window', {});

    speak('metin', 'tr');
    await new Promise((r) => setTimeout(r, 30));

    expect(konusulanlar).toHaveLength(0);
  });
});
