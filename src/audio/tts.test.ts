import { afterEach, describe, expect, it, vi } from 'vitest';
import { KONUSMA_DILI, isTtsSupported, speak } from './tts';

const DILLER = Object.keys(KONUSMA_DILI) as (keyof typeof KONUSMA_DILI)[];

/**
 * Sesli anlatıcının KONUŞTUĞU DİL.
 *
 * NEDEN TEST VAR: etiket `lang === 'tr' ? 'tr-TR' : 'en-US'` diye
 * yazılmıştı. Türkçe dışındaki dokuz dil İngilizce okunuyordu — Almanca
 * oynayan "Die Nacht beginnt"i İngiliz aksanıyla duyuyordu. Hiçbir yerde
 * hata vermiyor: ses çıkıyor, uygulama çalışıyor, yalnız yanlış dilde.
 * Yeni dil eklenip tabloya yazılmazsa aynı şey tekrar olur; buradaki
 * "her dilin kendi etiketi" testi onu yakalıyor.
 */

type SahteSoyleme = { lang: string; text: string };

/** Test ortamı Node; Web Speech API'si elle taklit ediliyor. */
function sesMotoruKur() {
  const soylenenler: SahteSoyleme[] = [];
  class SahteUtterance {
    lang = '';
    rate = 1;
    pitch = 1;
    constructor(public text: string) {}
  }
  vi.stubGlobal('SpeechSynthesisUtterance', SahteUtterance);
  vi.stubGlobal('window', {
    SpeechSynthesisUtterance: SahteUtterance,
    speechSynthesis: {
      speak: (u: SahteUtterance) => soylenenler.push({ lang: u.lang, text: u.text }),
      cancel: () => {},
    },
  });
  return soylenenler;
}

afterEach(() => vi.unstubAllGlobals());

describe('sesli anlatıcı dili', () => {
  it.each(DILLER.map((l) => [l]))('%s kendi dil etiketiyle okunuyor', (lang) => {
    const soylenenler = sesMotoruKur();

    speak('gece başlıyor', lang);

    expect(soylenenler).toHaveLength(1);
    // Etiket BCP-47 olmalı ve arayüz diliyle başlamalı: "de" → "de-DE".
    expect(soylenenler[0].lang).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    expect(soylenenler[0].lang.slice(0, 2)).toBe(lang);
  });

  it('İngilizce DIŞINDAKİ diller en-US okunmuyor', () => {
    const soylenenler = sesMotoruKur();

    for (const lang of DILLER.filter((l) => l !== 'en')) speak('metin', lang);

    expect(soylenenler.map((s) => s.lang)).not.toContain('en-US');
  });

  it('bölgeli kod (en-GB) da tanınıyor', () => {
    const soylenenler = sesMotoruKur();

    speak('text', 'en-GB');

    expect(soylenenler[0].lang).toBe('en-US');
  });

  it('bilinmeyen dil İngilizceye düşüyor, çökmüyor', () => {
    const soylenenler = sesMotoruKur();

    speak('text', 'xx');

    expect(soylenenler[0].lang).toBe('en-US');
  });

  it('ses motoru yoksa sessizce vazgeçiyor (Android WebView)', () => {
    // Android sistem WebView'ında `speechSynthesis` yok; patlamamalı.
    vi.stubGlobal('window', {});

    expect(isTtsSupported()).toBe(false);
    expect(() => speak('metin', 'tr')).not.toThrow();
  });
});
