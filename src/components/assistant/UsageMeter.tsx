import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { UsageSnapshot } from "@/lib/assistantApi";
import { useThemeColors } from "@/theme/useThemeColors";
import { Meta } from "@/components/ui/Meta";


/**
 * Medidor de mensajes del día, bajo el header. Espejo del de web, sin el enlace
 * de "Mejorar plan": el billing es solo web y las reglas de Apple prohíben un
 * CTA de compra dentro de la app (regla 10 de AGENTS.md).
 *
 * El comentario viejo decía que la barra "se pone ámbar al acercarse al tope",
 * y **no lo hacía**: las dos ramas del ternario pintaban `c.accent`. Ahora sí
 * cambia, y a `signal`, que es la voz de lo que estorba.
 */
export function UsageMeter({ usage }: { usage: UsageSnapshot | null }) {
  const { t } = useTranslation();
  const c = useThemeColors();
  if (!usage) return null;

  const cap = usage.daily_message_cap;
  const used = usage.messages_sent_today;
  const ratio = cap == null ? 0 : Math.min(1, used / Math.max(1, cap));
  const nearLimit = cap != null && ratio >= 0.8;

  return (
    <View className="border-b border-border px-4 py-2">
      <Meta tone={nearLimit ? "inherit" : "muted"} style={nearLimit ? { color: c.signal } : undefined}>
        {cap == null
          ? t("assistant.usage.uncapped")
          : t("assistant.usage.usedOf", { used, cap })}
      </Meta>
      {cap != null && (
        <View className="mt-1.5" style={{ height: 3, backgroundColor: c.line[8] }}>
          <View
            style={{
              height: 3,
              width: `${Math.round(ratio * 100)}%`,
              backgroundColor: nearLimit ? c.signal : c.accent,
            }}
          />
        </View>
      )}
    </View>
  );
}
