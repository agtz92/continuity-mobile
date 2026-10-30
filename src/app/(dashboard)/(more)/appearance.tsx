import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation } from "@apollo/client/react";
import { ChevronRight, Compass, RotateCcw } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useThemeColors } from "@/theme/useThemeColors";
import type { Theme } from "@/theme/config";
import type { Palette } from "@/palette/config";
import {
  SUPPORTED_LOCALES,
  LOCALE_LABEL,
  persistLocale,
  type Locale,
} from "@/lib/locale";
import { UPDATE_NOTIFICATION_SETTINGS } from "@/lib/graphql";
import { requestTour } from "@/lib/tour";
import { toast } from "@/lib/toast";
import { ScreenHeadline } from "@/components/ui/ScreenHeadline";
import { Segmented } from "@/components/ui/Segmented";
import { RuledRow } from "@/components/ui/RuledRow";
import {
  PaletteSwatches,
  ThemeSwatches,
  VocabularyBar,
} from "@/components/onboarding/AppearancePickers";

/** Sección: etiqueta en versalitas, explicación en tinta apagada, controles. */
function Section({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  const c = useThemeColors();
  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 4 }}>
        <Text
          accessibilityRole="header"
          className="font-sans-semibold uppercase"
          style={{ fontSize: 11, letterSpacing: 0.8, color: c.text3 }}
        >
          {label}
        </Text>
        {hint ? (
          <Text className="font-sans" style={{ fontSize: 15, lineHeight: 21, color: c.text3 }}>
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export default function Appearance() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { theme, palette, setTheme, setPalette } = useTheme();
  const [updateSettings] = useMutation(UPDATE_NOTIFICATION_SETTINGS);

  const activeLocale = (i18n.language === "es" ? "es" : "en") as Locale;

  // Re-arm the dashboard tour (mounted persistently in the dashboard layout) and
  // jump to the first tab so it plays in context.
  const replayTour = () => {
    requestTour();
    router.push("/today");
  };

  // Rehacer el setup inicial. `_layout.tsx` deja /onboarding alcanzable "para
  // que funcione la entrada de replay" — pero esa entrada no existía en móvil,
  // solo en el menú de cuenta de web. Sin ella no había forma de volver a ver
  // el onboarding desde el teléfono.
  const replaySetup = () => {
    router.push({ pathname: "/onboarding", params: { replay: "true" } });
  };

  // Theme/palette are owned per-user on the backend (ThemeProvider hydrates from
  // it on launch/foreground). Persist the choice to the server too — not just
  // local AsyncStorage — otherwise the next launch's server hydration re-applies
  // the stale server value and *reverts* the user's change. Apply locally first
  // for an instant flip; the backend write is non-fatal (error link toasts).
  const changeTheme = (next: Theme) => {
    setTheme(next);
    void updateSettings({ variables: { data: { theme: next } } }).catch(() => {});
  };
  const changePalette = (next: Palette) => {
    setPalette(next);
    void updateSettings({ variables: { data: { palette: next } } }).catch(() => {});
  };

  const changeLocale = async (next: Locale) => {
    if (next === activeLocale) return;
    // Apply + persist locally first so the UI flips instantly even if the
    // network is slow; then mirror to the backend so digests/notifications
    // use the same language. Backend failure is non-fatal — error link toasts.
    await persistLocale(next);
    try {
      await updateSettings({ variables: { data: { locale: next } } });
    } catch {
      /* error link already surfaces a toast */
    }
    toast.success(t("common.saved"));
  };

  const localeOptions = SUPPORTED_LOCALES.map((loc) => ({ value: loc, label: LOCALE_LABEL[loc] }));

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40, gap: 28 }}
    >
      <ScreenHeadline primary={t("settings.appearance.headline")} />

      <Section label={t("settings.appearance.language")} hint={t("settings.appearance.languageHint")}>
        <Segmented options={localeOptions} value={activeLocale} onChange={(v) => void changeLocale(v)} />
      </Section>

      <Section label={t("settings.appearance.theme")} hint={t("settings.appearance.themeHint")}>
        <ThemeSwatches value={theme} onChange={changeTheme} />
      </Section>

      <Section label={t("settings.appearance.palette")} hint={t("settings.appearance.paletteHint")}>
        <PaletteSwatches value={palette} onChange={changePalette} />
        <View style={{ marginTop: 6 }}>
          <VocabularyBar />
        </View>
      </Section>

      {/* Dos cosas que se pueden repetir, como lista rayada de 56. */}
      <Section label={t("settings.appearance.replayHeading")} hint={t("settings.appearance.replayHint")}>
        <View style={{ borderTopWidth: 1, borderTopColor: c.line[14] }}>
          <RuledRow
            onPress={replayTour}
            accessibilityLabel={t("onboarding.replay.replayTourButton")}
            leading={<View style={{ paddingTop: 2 }}><Compass size={20} color={c.text2} /></View>}
            trailing={<View style={{ alignSelf: "center" }}><ChevronRight size={18} color={c.text3} /></View>}
          >
            <Text className="font-sans-medium" style={{ fontSize: 17, lineHeight: 22, color: c.text }}>
              {t("onboarding.replay.replayTourButton")}
            </Text>
            <Text className="font-sans" style={{ fontSize: 14, lineHeight: 19, color: c.text3, marginTop: 2 }}>
              {t("settings.appearance.replayTourHint")}
            </Text>
          </RuledRow>
          <RuledRow
            onPress={replaySetup}
            accessibilityLabel={t("onboarding.replay.replaySetupButton")}
            leading={<View style={{ paddingTop: 2 }}><RotateCcw size={20} color={c.text2} /></View>}
            trailing={<View style={{ alignSelf: "center" }}><ChevronRight size={18} color={c.text3} /></View>}
          >
            <Text className="font-sans-medium" style={{ fontSize: 17, lineHeight: 22, color: c.text }}>
              {t("onboarding.replay.replaySetupButton")}
            </Text>
            <Text className="font-sans" style={{ fontSize: 14, lineHeight: 19, color: c.text3, marginTop: 2 }}>
              {t("settings.appearance.replaySetupHint")}
            </Text>
          </RuledRow>
        </View>
      </Section>
    </ScrollView>
  );
}
