/**
 * Opsiyonel sesli anlatıcı — cihazın kendi sesi, bedava
 * (01-architecture.md).
 *
 * NEDEN EKLENTİ: önceden doğrudan Web Speech API kullanılıyordu ve
 * Android'in sistem WebView'ı `speechSynthesis`i uygulamıyor. Sonuç 25
 * Ekim 2026 oyun gecesinde ortaya çıktı: "sesli anlatım iOS'ta var,
 * Android'de yok." Ayarlardaki anahtar Android'de hiç görünmüyordu,
 * kimse de sebebini bilmiyordu — sessiz bir eksiklikti.
 *
 * `@capacitor-community/text-to-speech` iki tarafı da kapatıyor:
 * uygulamada cihazın yerel TTS motoruna, webde yine `speechSynthesis`e
 * bağlanıyor. Tek kod yolu kaldı; platforma göre dallanma yok.
 */

import { isNativeApp } from '../util/platform';
// YALNIZ TİP: i18n modülü yüklenirken `document`e dokunuyor, burada
// çalışma zamanında gerekmiyor. `import type` derlemede siliniyor.
import type { Language } from '../i18n';

/**
 * Konuşma dili etiketleri (BCP-47).
 *
 * NEDEN TABLO: önceden `lang === 'tr' ? 'tr-TR' : 'en-US'` yazıyordu, yani
 * Türkçe dışındaki DOKUZ dilin hepsi İngilizce okunuyordu — Almanca
 * oynayan "Die Nacht beginnt" cümlesini İngiliz aksanıyla duyuyordu.
 *
 * `Record<Language, …>` BEKÇİ: yeni bir arayüz dili eklenip buraya
 * yazılmazsa proje derlenmiyor.
 */
export const KONUSMA_DILI: Record<Language, string> = {
  tr: 'tr-TR',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  pt: 'pt-PT',
  it: 'it-IT',
  ru: 'ru-RU',
  ja: 'ja-JP',
  ko: 'ko-KR',
};

/** i18next "en-GB" gibi bölgeli kod da verebiliyor; önekine bakılıyor. */
export function dilEtiketi(lang: string): string {
  const kok = (Object.keys(KONUSMA_DILI) as Language[]).find((l) => lang.startsWith(l));
  return kok ? KONUSMA_DILI[kok] : 'en-US';
}

type TtsApi = typeof import('@capacitor-community/text-to-speech');

/**
 * Eklenti modülü yüklenirken `window`a dokunuyor; bu yüzden statik değil,
 * ÇAĞRI ANINDA alınıyor (billing.ts'teki ile aynı desen).
 */
async function sdk(): Promise<TtsApi | null> {
  try {
    return await import('@capacitor-community/text-to-speech');
  } catch {
    return null;
  }
}

/**
 * Anahtar gösterilsin mi?
 *
 * Uygulamada eklenti pakette ve her iki platformda da yerel motor var →
 * her zaman evet. Webde tarayıcıya bakmak gerekiyor; `speechSynthesis`
 * yoksa eklentinin web tarafı da konuşamaz.
 */
export function isTtsSupported(): boolean {
  if (isNativeApp()) return true;
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string, lang: string): void {
  if (!text || !isTtsSupported()) return;
  void (async () => {
    const api = await sdk();
    if (!api) return;
    try {
      await api.TextToSpeech.speak({
        text,
        lang: dilEtiketi(lang),
        rate: 0.95,
        pitch: 0.85,
        // `Add`: bugünkü davranış korunuyor. Web Speech çağrıları sıraya
        // giriyordu; eklentinin varsayılanı (`Flush`) araya giren her
        // cümlenin öncekini kesmesi olurdu ve bu bir davranış değişikliği
        // olurdu — arızayı düzeltirken sessizce yapılacak şey değil.
        queueStrategy: api.QueueStrategy.Add,
      });
    } catch {
      // Cihazda ses motoru kurulu değil ya da dil paketi yok. Anlatıcı
      // süs; oyunu durdurmaz.
    }
  })();
}

export function stopSpeaking(): void {
  if (!isTtsSupported()) return;
  void (async () => {
    const api = await sdk();
    try {
      await api?.TextToSpeech.stop();
    } catch {
      /* konuşan bir şey yoksa bazı platformlar hata veriyor; önemsiz */
    }
  })();
}
