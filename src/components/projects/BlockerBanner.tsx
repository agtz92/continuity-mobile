import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Hatch } from "@/components/ui/Hatch";
import { Meta } from "@/components/ui/Meta";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

/**
 * Banner de bloqueo del detalle de proyecto (1g): trama + regla `signal` de
 * 3 px, cintillo "✕ Blocked 4 days · blocks 1 task" y, debajo, **la razón** a
 * cuerpo legible — "bloqueado" no le dice a nadie qué hacer, "esperando el
 * contrato firmado" sí. Se lee en una captura en gris (trama + ✕).
 */
export function BlockerBanner({
  since,
  reason,
  blocksCount,
}: {
  since: number;
  reason?: string;
  blocksCount: number;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const head =
    (since > 0 ? t("blocker.blockedDays", { count: since }) : t("blocker.blocked")) +
    (blocksCount > 0 ? ` · ${t("blocker.blocksTasks", { count: blocksCount })}` : "");

  return (
    <Hatch
      color={alpha(c.signal, 0.25)}
      accessibilityRole="alert"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: c.signal,
        paddingHorizontal: 16,
        paddingVertical: 14,
        overflow: "hidden",
        gap: 6,
      }}
    >
      <View className="flex-row items-center gap-2">
        <Text className="font-sans" style={{ color: c.signal, fontSize: 13 }}>
          ✕
        </Text>
        <Meta variant="cintillo" tone="inherit" style={{ color: c.signal, flexShrink: 1 }}>
          {head}
        </Meta>
      </View>
      {reason ? (
        <Text className="font-sans" style={{ fontSize: 16, lineHeight: 22, color: c.text }}>
          {reason}
        </Text>
      ) : null}
    </Hatch>
  );
}
