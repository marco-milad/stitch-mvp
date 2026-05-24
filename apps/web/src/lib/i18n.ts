import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from '../locales/ar.json';
import en from '../locales/en.json';

const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

function detectInitialLanguage(): 'en' | 'ar' {
  if (typeof navigator === 'undefined') return 'en';
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('stitch.lang') : null;
  if (stored === 'ar' || stored === 'en') return stored;
  const browser = (navigator.language || 'en').toLowerCase().split('-')[0];
  return browser === 'ar' ? 'ar' : 'en';
}

const initialLng = detectInitialLanguage();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: initialLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

/** Apply `dir="rtl"` to <html> + persist choice. Call when the user switches. */
export function applyLanguage(lng: string): void {
  if (typeof document === 'undefined') return;
  const isRtl = RTL_LOCALES.has(lng);
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
  try {
    localStorage.setItem('stitch.lang', lng);
  } catch {
    // private mode / quota — no-op
  }
}

applyLanguage(initialLng);

i18n.on('languageChanged', applyLanguage);

export default i18n;
