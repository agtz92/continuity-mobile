// Hermes ships no (working) Intl.PluralRules, so intl-messageformat's `plural`
// blocks throw and i18next-icu silently returns the raw ICU source. Force the
// FormatJS polyfill + en/es CLDR data BEFORE i18next-icu loads.
import "@formatjs/intl-pluralrules/polyfill-force";
import "@formatjs/intl-pluralrules/locale-data/en";
import "@formatjs/intl-pluralrules/locale-data/es";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ICU from "i18next-icu";
import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import en from "../messages/en.json";
import es from "../messages/es.json";

const deviceLanguage = getLocales()[0]?.languageCode ?? "en";
const lng = deviceLanguage === "es" ? "es" : "en";

void i18n
  .use(ICU)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    lng,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    returnNull: false,
  });

// Override the device-derived language with the user's saved preference, if any.
// Kept inline (rather than importing lib/locale) to avoid a circular import —
// lib/locale imports this module. The key must match LOCALE_KEY there.
void AsyncStorage.getItem("continuity.locale").then((saved) => {
  if ((saved === "en" || saved === "es") && saved !== i18n.language) {
    void i18n.changeLanguage(saved);
  }
});

export default i18n;
