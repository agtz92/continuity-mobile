import { View } from "react-native";
import { useTranslation } from "react-i18next";
import type { UsageSnapshot } from "@/lib/assistantApi";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Barra de uso de 3 px bajo la cabecera de Loop. La cifra ("3 messages left
 * today") ya vive en la cabecera; aquí solo queda la proporción. Sin enlace de
 * "Mejorar plan": las reglas de Apple prohíben un CTA de compra dentro de la
 * app (regla 10 de AGENTS.md).
 *
 * Solo se pinta con tope diario (`daily_message_cap`): sin tope no hay nada
 * que medir. Pasa a `signal` al acercarse al límite (≥ 80 %).
 */
export function UsageMeter({ usage }: { usage: UsageSnapshot | null }) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const cap = usage?.daily_message_cap;
  if (!usage || cap == null) return null;

  const used = usage.messages_sent_today;
  const ratio = Math.min(1, used / Math.max(1, cap));
  const nearLimit = ratio >= 0.8;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={t("assistant.usage.usedOf", { used, cap })}
      accessibilityValue={{ min: 0, max: cap, now: Math.min(used, cap) }}
      style={{ height: 3, backgroundColor: c.line[8] }}
    >
      <View
        style={{
          height: 3,
          width: `${Math.round(ratio * 100)}%`,
          backgroundColor: nearLimit ? c.signal : c.accent,
        }}
      />
    </View>
  );
}
