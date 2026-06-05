import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation } from "@apollo/client/react";
import { Compass } from "lucide-react-native";
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
      onPress={onPress}
      className={
        "rounded-full border px-3 py-1 " +
        (active ? "border-accent bg-accent" : "border-border bg-surface")
      }
    >
      <Text className={"text-base " + (active ? "font-semibold text-bg" : "text-text")}>
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
        <Text className="text-base font-semibold text-text">
          {t("settings.appearance.language")}
        </Text>
        <Text className="text-sm text-text-muted">
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
        <Text className="text-base font-semibold text-text">
          {t("settings.appearance.theme")}
        </Text>
        <Text className="text-sm text-text-muted">
          {t("settings.appearance.themeHint")}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {SUPPORTED_THEMES.map((th) => (
            <Pill
              key={th}
              label={t(`settings.appearance.${THEME_LABEL_KEY[th]}`)}
              active={theme === th}
              onPress={() => setTheme(th)}
            />
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-base font-semibold text-text">
          {t("settings.appearance.palette")}
        </Text>
        <Text className="text-sm text-text-muted">
          {t("settings.appearance.paletteHint")}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {SUPPORTED_PALETTES.map((pl) => (
            <Pill
              key={pl}
              label={t(`settings.appearance.${PALETTE_LABEL_KEY[pl]}`)}
              active={palette === pl}
              onPress={() => setPalette(pl)}
            />
          ))}
        </View>
        <View className="mt-2 flex-row gap-2">
          <View className="h-8 flex-1 rounded-lg bg-accent" />
          <View className="h-8 flex-1 rounded-lg bg-accent-2" />
        </View>
      </View>

      <Pressable
        onPress={replayTour}
        accessibilityRole="button"
        className="flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-4 active:opacity-80"
      >
        <Compass size={16} color={c.text} />
        <Text className="text-base font-semibold text-text">
          {t("onboarding.replay.replayTourButton")}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
