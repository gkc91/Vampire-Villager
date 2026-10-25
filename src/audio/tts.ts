/**
 * Opsiyonel sesli anlatıcı — Web Speech API, cihaz-yerel ve bedava
 * (01-architecture.md). Desteklenmeyen cihazda sessizce devre dışı kalır.
 *
 * ANDROID UYARISI: Android'in sistem WebView'ı `speechSynthesis`i
 * uygulamıyor; `isTtsSupported()` orada false dönüyor ve ayarlardaki
 * anahtar hiç görünmüyor. iOS'ta (WKWebView) çalışıyor. 25 Ekim 2026'daki
 * oyun gecesinde fark edildi: "sesli anlatım Android'de yok, iOS'ta var."
 * Çözümü yerel bir eklenti gerektiriyor, web tarafında yapılacak bir şey
 * yok — bu dosya o güne kadar iOS ve tarayıcıyı idare ediyor.
 */

// YALNIZ TİP: i18n modülü yüklenirken `document`e dokunuyor, bu dosyanın
// ona çalışma zamanında ihtiyacı yok. `import type` derlemede siliniyor.
import type { Language } from '../i18n';

/**
 * Konuşma dili etiketleri (BCP-47).
 *
 * NEDEN TABLO: önceden `lang === 'tr' ? 'tr-TR' : 'en-US'` yazıyordu, yani
 * Türkçe dışındaki DOKUZ dilin hepsi İngilizce okunuyordu — Almanca
 * oynayan "Die Nacht beginnt" cümlesini İngiliz aksanıyla duyuyordu.
 * Ses motoru bir dili tanımazsa zaten kendi varsayılanına düşüyor; yanlış
 * etiket göndermek için bir sebep yok.
 *
 * `Record<Language, …>` BEKÇİ: yeni bir arayüz dili eklenip buraya
 * yazılmazsa proje derlenmiyor. Liste burada tutulduğu için eksik kalması
 * mümkün değil.
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

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string, lang: string): void {
  if (!isTtsSupported() || !text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = dilEtiketi(lang);
  utterance.rate = 0.95;
  utterance.pitch = 0.85;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (isTtsSupported()) window.speechSynthesis.cancel();
}
