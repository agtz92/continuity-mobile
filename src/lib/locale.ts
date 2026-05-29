import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "./i18n";

export const SUPPORTED_LOCALES = ["en", "es"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABEL: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

/** AsyncStorage key — mirrors i18n.ts's boot read. Keep both in sync. */
export const LOCALE_KEY = "continuity.locale";

export function isLocale(v: unknown): v is Locale {
  return v === "en" || v === "es";
}

/**
 * Apply a locale immediately (i18next) and persist it so it survives restarts.
 * Server-side persistence (for digests/notifications) is handled separately by
 * the caller via UPDATE_NOTIFICATION_SETTINGS, since that needs Apollo.
 */
export async function persistLocale(locale: Locale): Promise<void> {
  if (i18n.language !== locale) await i18n.changeLanguage(locale);
  await AsyncStorage.setItem(LOCALE_KEY, locale);
}
