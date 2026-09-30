import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import common_en from "./locales/en/common.json";
import common_fr from "./locales/fr/common.json";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { common: common_fr },
      en: { common: common_en },
    },
    fallbackLng: "fr",
    supportedLngs: ["fr", "en"],
    defaultNS: "common",
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "gsms-portal-lang",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
