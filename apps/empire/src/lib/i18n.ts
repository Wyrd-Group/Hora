/**
 * i18n.ts — Lightweight internationalization engine for AEGIS Empire
 *
 * Supports 20 languages with nested key lookups, RTL detection,
 * and pluralization. Translation files are lazily loaded.
 */

import { create } from 'zustand';
import { createLogger } from './logger';

const log = createLogger('i18n');

// ── Supported Languages ──────────────────────────────────────────
export const LANGUAGES = [
  { code: 'en',    label: 'English',     nativeLabel: 'English',      dir: 'ltr' },
  { code: 'fr',    label: 'French',      nativeLabel: 'Français',     dir: 'ltr' },
  { code: 'pt',    label: 'Portuguese',  nativeLabel: 'Português',    dir: 'ltr' },
  { code: 'es',    label: 'Spanish',     nativeLabel: 'Español',      dir: 'ltr' },
  { code: 'de',    label: 'German',      nativeLabel: 'Deutsch',      dir: 'ltr' },
  { code: 'it',    label: 'Italian',     nativeLabel: 'Italiano',     dir: 'ltr' },
  { code: 'no',    label: 'Norwegian',   nativeLabel: 'Norsk',        dir: 'ltr' },
  { code: 'fi',    label: 'Finnish',     nativeLabel: 'Suomi',        dir: 'ltr' },
  { code: 'sv',    label: 'Swedish',     nativeLabel: 'Svenska',      dir: 'ltr' },
  { code: 'da',    label: 'Danish',      nativeLabel: 'Dansk',        dir: 'ltr' },
  { code: 'nl',    label: 'Dutch',       nativeLabel: 'Nederlands',   dir: 'ltr' },
  { code: 'af',    label: 'Afrikaans',   nativeLabel: 'Afrikaans',    dir: 'ltr' },
  { code: 'ar',    label: 'Arabic',      nativeLabel: 'العربية',       dir: 'rtl' },
  { code: 'he',    label: 'Hebrew',      nativeLabel: 'עברית',         dir: 'rtl' },
  { code: 'hi',    label: 'Hindi',       nativeLabel: 'हिन्दी',          dir: 'ltr' },
  { code: 'zh',    label: 'Mandarin',    nativeLabel: '中文',           dir: 'ltr' },
  { code: 'ja',    label: 'Japanese',    nativeLabel: '日本語',          dir: 'ltr' },
  { code: 'ko',    label: 'Korean',      nativeLabel: '한국어',          dir: 'ltr' },
  { code: 'yue',   label: 'Cantonese',   nativeLabel: '粵語',           dir: 'ltr' },
  { code: 'ms',    label: 'Malay',       nativeLabel: 'Bahasa Melayu', dir: 'ltr' },
] as const;

export type LanguageCode = typeof LANGUAGES[number]['code'];

export const RTL_LANGUAGES: LanguageCode[] = ['ar', 'he'];

// ── Translation Store ────────────────────────────────────────────
interface I18nStore {
  language: LanguageCode;
  translations: Record<string, any>;
  loaded: boolean;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// Translation module cache
const translationCache: Record<string, Record<string, any>> = {};

// Lazy import map for all locale files
const localeImports: Record<string, () => Promise<any>> = {
  en: () => import('../locales/en.json'),
  fr: () => import('../locales/fr.json'),
  pt: () => import('../locales/pt.json'),
  es: () => import('../locales/es.json'),
  de: () => import('../locales/de.json'),
  it: () => import('../locales/it.json'),
  no: () => import('../locales/no.json'),
  fi: () => import('../locales/fi.json'),
  sv: () => import('../locales/sv.json'),
  da: () => import('../locales/da.json'),
  nl: () => import('../locales/nl.json'),
  af: () => import('../locales/af.json'),
  ar: () => import('../locales/ar.json'),
  he: () => import('../locales/he.json'),
  hi: () => import('../locales/hi.json'),
  zh: () => import('../locales/zh.json'),
  ja: () => import('../locales/ja.json'),
  ko: () => import('../locales/ko.json'),
  yue: () => import('../locales/yue.json'),
  ms: () => import('../locales/ms.json'),
};

async function loadTranslations(lang: LanguageCode): Promise<Record<string, any>> {
  if (translationCache[lang]) return translationCache[lang];
  try {
    const mod = await localeImports[lang]();
    const data = mod.default || mod;
    translationCache[lang] = data;
    return data;
  } catch (e) {
    log.warn(`Failed to load ${lang}, falling back to English`);
    if (lang !== 'en') return loadTranslations('en');
    return {};
  }
}

// Get nested value from object by dot-separated key
function getNestedValue(obj: any, key: string): string | undefined {
  const parts = key.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return typeof current === 'string' ? current : undefined;
}

// Detect saved language or browser language
function detectLanguage(): LanguageCode {
  try {
    const saved = localStorage.getItem('aegis-language');
    if (saved && LANGUAGES.some(l => l.code === saved)) return saved as LanguageCode;
  } catch (e) { log.warn('Failed to detect saved language', e); }

  const browserLang = navigator.language?.split('-')[0];
  const match = LANGUAGES.find(l => l.code === browserLang);
  return match ? match.code : 'en';
}

// English translations loaded synchronously as fallback
let englishFallback: Record<string, any> = {};

export const useI18nStore = create<I18nStore>((set, get) => ({
  language: detectLanguage(),
  translations: {},
  loaded: false,

  setLanguage: async (lang: LanguageCode) => {
    const translations = await loadTranslations(lang);
    // Also ensure English is loaded as fallback
    if (lang !== 'en' && !translationCache['en']) {
      englishFallback = await loadTranslations('en');
    }
    set({ language: lang, translations, loaded: true });
    localStorage.setItem('aegis-language', lang);
    // Update document direction for RTL languages
    document.documentElement.dir = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  },

  t: (key: string, params?: Record<string, string | number>): string => {
    const { translations } = get();
    let value = getNestedValue(translations, key)
      ?? getNestedValue(englishFallback, key)
      ?? key;

    // Replace {{param}} placeholders
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      }
    }
    return value;
  },
}));

// Initialize on import — load active language + English fallback
(async () => {
  const lang = detectLanguage();
  const translations = await loadTranslations(lang);
  if (lang !== 'en') {
    englishFallback = await loadTranslations('en');
  } else {
    englishFallback = translations;
  }
  useI18nStore.setState({ translations, loaded: true });
})();

// Convenience hook — subscribes to language so components re-render on switch
export function useTranslation() {
  const language = useI18nStore(s => s.language);
  const translations = useI18nStore(s => s.translations);
  const setLanguage = useI18nStore(s => s.setLanguage);
  const dir = RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';

  // Build a fresh t() that closes over current translations
  const tFn = (key: string, params?: Record<string, string | number>): string => {
    let value = getNestedValue(translations, key)
      ?? getNestedValue(englishFallback, key)
      ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      }
    }
    return value;
  };

  return { t: tFn, language, setLanguage, dir };
}

// Non-hook version for stores/engines
export function t(key: string, params?: Record<string, string | number>): string {
  return useI18nStore.getState().t(key, params);
}
