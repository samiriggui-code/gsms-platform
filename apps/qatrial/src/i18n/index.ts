import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    backend: {
      loadPath: '/locales/{{lng}}/common.json',
    },

    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'qatrial:language',
      caches: ['localStorage'],
    },

    supportedLngs: ['en', 'fr'],

    fallbackLng: {
      'en-US': ['en'],
      'en-CA': ['en'],
      'en-GB': ['en'],
      'fr-CA': ['fr'],
      'fr-BE': ['fr'],
      'fr-CH': ['fr'],
      default: ['en'],
    },

    ns: ['common'],
    defaultNS: 'common',

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: true,
    },
  });

export default i18n;
