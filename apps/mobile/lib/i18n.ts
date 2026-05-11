import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { I18nManager } from 'react-native';
import { initReactI18next } from 'react-i18next';

import ar from '../locales/ar.json';
import en from '../locales/en.json';

const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

const phoneLocale = Localization.getLocales()[0]?.languageCode ?? 'en';
const initialLng = phoneLocale === 'ar' ? 'ar' : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: initialLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

/**
 * Sync `I18nManager.isRTL` with the chosen language. RTL changes only take
 * effect after a full app reload — on first install Expo will reload once
 * automatically; manual toggling later needs `Updates.reloadAsync()`.
 */
export function syncRtlForLanguage(lng: string): void {
  const shouldBeRTL = RTL_LOCALES.has(lng);
  if (shouldBeRTL !== I18nManager.isRTL) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
  }
}

syncRtlForLanguage(initialLng);

export default i18n;
