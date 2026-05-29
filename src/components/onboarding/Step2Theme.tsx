import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/ThemeProvider";
import { SUPPORTED_THEMES, THEME_LABEL_KEY } from "@/theme/config";
import { SUPPORTED_PALETTES, PALETTE_LABEL_KEY, PALETTE_SWATCHES } from "@/palette/config";
import { PrimaryButton, Pill } from "./controls";

/**
 * Step 2 — theme mode + palette. Drives the live ThemeProvider directly so the
 * whole app previews the choice instantly (setTheme/setPalette persist locally
 * to AsyncStorage). The flow's onNext mirrors the final pick to the backend via
 * updateNotificationSettings. Swatches preview the accent pair for the active
 * effective theme, matching the web Step2Theme.
 */
export function Step2Theme({
  busy,
  onNext,
}: {
  busy: boolean;
  onNext: (v: { theme: string; palette: string }) => void;
}) {
  const { t } = useTranslation();
  const { theme, palette, effective, setTheme, setPalette } = useTheme();

  return (
    <View className="gap-6">
      <View className="gap-2">
        <Text className="text-3xl font-bold text-text">
          {t("onboarding.step2.heading")}
        </Text>
        <Text className="text-base text-text-muted">
          {t("onboarding.step2.sub")}
        </Text>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-text">
          {t("onboarding.step2.mode")}
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
        <Text className="text-sm font-medium text-text">
          {t("onboarding.step2.palette")}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {SUPPORTED_PALETTES.map((pl) => {
            const [a, a2] = PALETTE_SWATCHES[pl][effective];
            return (
              <Pill
                key={pl}
                label={t(`settings.appearance.${PALETTE_LABEL_KEY[pl]}`)}
                active={palette === pl}
                onPress={() => setPalette(pl)}
                leading={
                  <View className="flex-row">
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: a,
                      }}
                    />
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        marginLeft: -4,
                        backgroundColor: a2,
                      }}
                    />
                  </View>
                }
              />
            );
          })}
        </View>
      </View>

      <PrimaryButton
        label={t("onboarding.next")}
        onPress={() => onNext({ theme, palette })}
        busy={busy}
      />
    </View>
  );
}
