import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import trUi from './locales/tr/ui.json';
import trRoles from './locales/tr/roles.json';
import trNarration from './locales/tr/narration.json';
import enUi from './locales/en/ui.json';
import enRoles from './locales/en/roles.json';
import enNarration from './locales/en/narration.json';

export const SUPPORTED_LANGUAGES = ['tr', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** Dil adları çevrilmez; her dil kendi adını kendi dilinde yazar. */
export const LANGUAGE_LABELS: Record<Language, string> = {
  tr: 'Türkçe',
  en: 'English',
};

export const resources = {
  tr: { ui: trUi, roles: trRoles, narration: trNarration },
  en: { ui: enUi, roles: enRoles, narration: enNarration },
} as const;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'tr',
    supportedLngs: [...SUPPORTED_LANGUAGES],
    ns: ['ui', 'roles', 'narration'],
    defaultNS: 'ui',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'vk_lang',
      caches: ['localStorage'],
    },
  });

export function setLanguage(lang: Language): void {
  void i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
}

export default i18n;
