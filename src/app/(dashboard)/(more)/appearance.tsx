import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation } from "@apollo/client/react";
import { Compass, RotateCcw } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useThemeColors } from "@/theme/useThemeColors";
import { SUPPORTED_THEMES, THEME_LABEL_KEY } from "@/theme/config";
import { SUPPORTED_PALETTES, PALETTE_LABEL_KEY } from "@/palette/config";
import {
  SUPPORTED_LOCALES,
  LOCALE_LABEL,
  persistLocale,
  type Locale,
} from "@/lib/locale";
import { UPDATE_NOTIFICATION_SETTINGS } from "@/lib/graphql";
import { requestTour } from "@/lib/tour";
import { toast } from "@/lib/toast";
import { selectionFeedback } from "@/lib/feedback";

function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        selectionFeedback();
        onPress();
      }}
      className={
        "rounded-full border px-3 py-1 " +
        (active ? "border-accent bg-accent" : "border-border bg-surface")
      }
    >
      <Text className={"text-base " + (active ? "font-sans-semibold text-bg" : "text-text")}>
        {label}
      </Text>
    </Pressable>
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
  const changeTheme = (next: (typeof SUPPORTED_THEMES)[number]) => {
    setTheme(next);
    void updateSettings({ variables: { data: { theme: next } } }).catch(() => {});
  };
  const changePalette = (next: (typeof SUPPORTED_PALETTES)[number]) => {
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

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="gap-6 p-5"
    >
      <View className="gap-2">
        <Text className="text-base font-sans-semibold text-text">
          {t("settings.appearance.language")}
        </Text>
        <Text className="font-sans text-sm text-text-muted">
          {t("settings.appearance.languageHint")}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {SUPPORTED_LOCALES.map((loc) => (
            <Pill
              key={loc}
              label={LOCALE_LABEL[loc]}
              active={activeLocale === loc}
              onPress={() => void changeLocale(loc)}
            />
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-base font-sans-semibold text-text">
          {t("settings.appearance.theme")}
        </Text>
        <Text className="font-sans text-sm text-text-muted">
          {t("settings.appearance.themeHint")}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {SUPPORTED_THEMES.map((th) => (
            <Pill
              key={th}
              label={t(`settings.appearance.${THEME_LABEL_KEY[th]}`)}
              active={theme === th}
              onPress={() => changeTheme(th)}
            />
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-base font-sans-semibold text-text">
          {t("settings.appearance.palette")}
        </Text>
        <Text className="font-sans text-sm text-text-muted">
          {t("settings.appearance.paletteHint")}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {SUPPORTED_PALETTES.map((pl) => (
            <Pill
              key={pl}
              label={t(`settings.appearance.${PALETTE_LABEL_KEY[pl]}`)}
              active={palette === pl}
              onPress={() => changePalette(pl)}
            />
          ))}
        </View>
        {/* La muestra enseña **el vocabulario entero**, no dos acentos: lo que
            la paleta cambia (acento y su segundo, que hoy solo vive en las
            gráficas) y lo que no cambia nunca (lo que duele, lo que se cerró,
            y la rampa de tinta). Antes eran dos bloques iguales y no se veía
            que el segundo casi no se usa. */}
        <View className="mt-2 flex-row items-stretch gap-1">
          <View className="h-8 flex-[3] rounded-lg bg-accent" />
          <View className="h-8 flex-1 rounded-lg bg-accent-2" />
          <View className="h-8 flex-1 rounded-lg" style={{ backgroundColor: c.signal }} />
          <View className="h-8 flex-1 rounded-lg" style={{ backgroundColor: c.closed }} />
          <View className="h-8 flex-1 rounded-lg" style={{ backgroundColor: c.line[34] }} />
        </View>
      </View>

      <Pressable
        onPress={replayTour}
        accessibilityRole="button"
        className="flex-row items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-4 active:opacity-80"
      >
        <Compass size={16} color={c.text} />
        <Text className="text-base font-sans-semibold text-text">
          {t("onboarding.replay.replayTourButton")}
        </Text>
      </Pressable>

      <Pressable
        onPress={replaySetup}
        accessibilityRole="button"
        className="flex-row items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-4 active:opacity-80"
      >
        <RotateCcw size={16} color={c.text} />
        <Text className="text-base font-sans-semibold text-text">
          {t("onboarding.replay.replaySetupButton")}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
