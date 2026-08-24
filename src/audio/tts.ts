/**
 * Opsiyonel sesli anlatıcı — Web Speech API, cihaz-yerel ve bedava
 * (01-architecture.md). Desteklenmeyen cihazda sessizce devre dışı kalır.
 */

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string, lang: string): void {
  if (!isTtsSupported() || !text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'tr' ? 'tr-TR' : 'en-US';
  utterance.rate = 0.95;
  utterance.pitch = 0.85;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (isTtsSupported()) window.speechSynthesis.cancel();
}
