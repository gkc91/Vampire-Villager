import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

/**
 * Çeviri dosyaları tek tek import EDİLMİYOR.
 *
 * On dil × üç dosya = otuz import satırı demekti ve yeni bir dil eklerken
 * üçünden birini unutmak sessiz bir hata olurdu: eksik ad alanı çalışma
 * anında anahtar adını ekrana basar. Klasörü taramak, dil eklemeyi
 * "klasörü oluştur" adımına indiriyor. Eksik/fazla anahtarları
 * `locales.test.ts` yakalıyor.
 */
const paketler = import.meta.glob<Record<string, unknown>>('./locales/*/*.json', {
  eager: true,
  import: 'default',
});

/**
 * Sıra, ayarlardaki dil listesinin sırasıdır. Türkçe ilk: asıl hedef pazar.
 * Sonra İngilizce, sonra alfabetik olmayan ama kasıtlı bir sıra — Avrupa
 * dilleri, ardından tür için güçlü pazarlar.
 */
export const SUPPORTED_LANGUAGES = [
  'tr',
  'en',
  'de',
  'fr',
  'es',
  'pt',
  'it',
  'ru',
  'ja',
  'ko',
] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** Dil adları çevrilmez; her dil kendi adını kendi dilinde yazar. */
export const LANGUAGE_LABELS: Record<Language, string> = {
  tr: 'Türkçe',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  pt: 'Português',
  it: 'Italiano',
  ru: 'Русский',
  ja: '日本語',
  ko: '한국어',
};

function paket(lang: string, ad: string): Record<string, unknown> {
  const m = paketler[`./locales/${lang}/${ad}.json`];
  if (!m) throw new Error(`çeviri dosyası yok: ${lang}/${ad}.json`);
  return m;
}

export const resources = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((lang) => [
    lang,
    { ui: paket(lang, 'ui'), roles: paket(lang, 'roles'), narration: paket(lang, 'narration') },
  ]),
);

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'tr',
    supportedLngs: [...SUPPORTED_LANGUAGES],
    /**
     * Tarayıcı `pt-BR`, `en-GB`, `de-AT` gibi bölgesel kodlar veriyor.
     * Bunlar desteklenenler listesinde olmadığı için doğrudan yedek dile
     * düşerdi: Brezilyalı bir kullanıcı Portekizce dosyası dururken
     * Türkçe görürdü. `languageOnly` bölge ekini atıp ana dile indiriyor.
     */
    load: 'languageOnly',
    ns: ['ui', 'roles', 'narration'],
    defaultNS: 'ui',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'vk_lang',
      caches: ['localStorage'],
    },
  });

/**
 * `<html lang>` her zaman gösterilen dille aynı kalmalı.
 *
 * Yalnız setLanguage içinde güncelliyordu; kullanıcı ayarlardan dil
 * değiştirmediyse etiket index.html'deki "tr" olarak kalıyordu. Tarayıcısı
 * İngilizce olan biri uygulamayı açtığında arayüz İngilizceydi ama etiket
 * Türkçe: CSS'in `text-transform: uppercase` kuralı Türkçe harf kuralını
 * uygulayıp "CONNECTION INFO" yerine "CONNECTİON İNFO" yazıyordu (Türkçe'de
 * i → İ). Algılamayla gelen dil de dahil, her değişimde eşitle.
 */
i18n.on('languageChanged', (lang) => {
  document.documentElement.lang = lang;
});
document.documentElement.lang = i18n.language || 'tr';

export function setLanguage(lang: Language): void {
  void i18n.changeLanguage(lang);
}

export default i18n;
