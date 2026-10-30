import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/ThemeProvider";
import { useThemeColors } from "@/theme/useThemeColors";
import { Meta } from "@/components/ui/Meta";
import { PaletteSwatches, ThemeSwatches } from "./AppearancePickers";
import { PrimaryButton, StepHeading, StepLabel, StepLayout } from "./controls";

/**
 * Paso 1 — tema + paleta. Drives the live ThemeProvider directly so the whole
 * app previews the choice instantly (setTheme/setPalette persist locally to
 * AsyncStorage). The flow's onNext mirrors the final pick to the backend via
 * updateNotificationSettings. Las muestras son las mismas de Appearance
 * (`AppearancePickers`), y la tarjeta "Preview" enseña una fila de proyecto
 * con su espina en el acento elegido.
 */
export function StepTheme({
  busy,
  onNext,
}: {
  busy: boolean;
  onNext: (v: { theme: string; palette: string }) => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const { theme, palette, setTheme, setPalette } = useTheme();

  return (
    <StepLayout
      footer={
        <PrimaryButton
          label={t("onboarding.next")}
          onPress={() => onNext({ theme, palette })}
          busy={busy}
        />
      }
    >
      <StepHeading title={t("onboarding.theme.heading")} sub={t("onboarding.theme.sub")} />

      <View style={{ gap: 10 }}>
        <StepLabel>{t("onboarding.theme.mode")}</StepLabel>
        <ThemeSwatches value={theme} onChange={setTheme} />
      </View>

      <View style={{ gap: 10 }}>
        <StepLabel>{t("onboarding.theme.palette")}</StepLabel>
        <PaletteSwatches value={palette} onChange={setPalette} />
      </View>

      {/* Una sola tarjeta: la vista previa de una fila de proyecto. */}
      <View
        style={{
          gap: 12,
          padding: 16,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: c.line[14],
          backgroundColor: c.surface,
        }}
      >
        <Meta variant="cintillo" tone="muted">
          {t("onboarding.theme.preview")}
        </Meta>
        <View className="flex-row" style={{ gap: 12 }}>
          <View style={{ width: 3, borderRadius: 2, backgroundColor: c.accent }} />
          <View className="min-w-0 flex-1" style={{ gap: 4, paddingVertical: 2 }}>
            <Text className="font-display" style={{ fontSize: 20, lineHeight: 24, color: c.text }}>
              {t("onboarding.theme.previewProject")}
            </Text>
            <Meta variant="cintillo" tone="inherit" style={{ color: c.accent }}>
              {t("onboarding.theme.previewMeta")}
            </Meta>
          </View>
        </View>
      </View>
    </StepLayout>
  );
}
