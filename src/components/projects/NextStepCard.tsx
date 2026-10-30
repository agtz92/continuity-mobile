import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Meta } from "@/components/ui/Meta";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

const BUTTON_H = 48;

/**
 * "Next step" del detalle de proyecto (1g) con sus dos salidas:
 *
 * - **Continue here** (primario): convierte el next step en una tarea para hoy.
 *   Sin next step no hay nada que continuar, así que no se pinta.
 * - **Update** (secundario): registra un avance del proyecto.
 */
export function NextStepCard({
  nextStep,
  onContinue,
  onUpdate,
}: {
  nextStep: string;
  onContinue: () => void;
  onUpdate: () => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const has = nextStep.trim().length > 0;

  return (
    <View
      className="gap-3 rounded-lg border p-4"
      style={{ backgroundColor: alpha(c.accent, 0.05), borderColor: c.line[14] }}
    >
      <Meta variant="cintillo" tone="inherit" style={{ color: c.accent }}>
        {t("views.projects.card.nextStep")}
      </Meta>
      {has ? (
        <Text className="font-sans" style={{ fontSize: 17, lineHeight: 24, color: c.text }}>
          → {nextStep}
        </Text>
      ) : (
        <Text className="font-sans italic" style={{ fontSize: 15, color: c.text3 }}>
          {t("views.projects.card.nextStepEmpty")}
        </Text>
      )}
      <View className="flex-row gap-3">
        {has ? (
          <Pressable
            onPress={onContinue}
            accessibilityRole="button"
            accessibilityHint={t("views.projectDetail.continueHint")}
            className="flex-1 items-center justify-center rounded-md active:opacity-80"
            style={{ height: BUTTON_H, backgroundColor: c.accent }}
          >
            <Text className="font-sans-semibold" style={{ fontSize: 16, color: c.bg }}>
              {t("views.projectDetail.continueHere")}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onUpdate}
          accessibilityRole="button"
          className={
            "items-center justify-center rounded-md border px-5 active:opacity-70 " +
            (has ? "" : "flex-1")
          }
          style={{ height: BUTTON_H, backgroundColor: c.surface, borderColor: c.line[18] }}
        >
          <Text className="font-sans-medium" style={{ fontSize: 16, color: c.text }}>
            {t("views.projectDetail.update")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
