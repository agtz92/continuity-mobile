import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useThemeColors, alpha } from "@/theme/useThemeColors";
import { Hatch } from "./Hatch";
import { Meta } from "./Meta";

/**
 * Badge de bloqueo. Trama + ✕ + días, **nunca solo color**: tiene que leerse en
 * una captura en escala de grises.
 *
 * `compact` deja solo "✕ Nd" para las filas densas; la variante completa añade
 * la razón, que es lo que de verdad desatasca — "bloqueado" no le dice a nadie
 * qué hacer, "esperando el contrato firmado" sí.
 */
export function BlockerBadge({
  since,
  reason,
  blocksCount,
  compact = false,
  label = false,
}: {
  /** Días que lleva abierto. */
  since: number;
  /** Por qué está detenido. */
  reason?: string;
  /** Cuántas tareas arrastra bloqueadas. */
  blocksCount?: number;
  compact?: boolean;
  /** En `compact`, escribe la palabra además del ✕. */
  label?: boolean;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();

  if (compact) {
    return (
      <Hatch
        color={alpha(c.signal, 0.35)}
        gap={5}
        style={{
          borderWidth: 1,
          borderColor: alpha(c.signal, 0.5),
          borderRadius: 4,
          paddingHorizontal: 6,
          paddingVertical: 2,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          overflow: "hidden",
        }}
      >
        <Text style={{ color: c.signal, fontSize: 11 }}>✕</Text>
        <Meta variant={label ? "cintillo" : "dato"} tone="inherit" style={{ color: c.signal }}>
          {label ? t("blocker.blocked") : ""}
          {label && since > 0 ? " " : ""}
          {/* Un blocker abierto hoy no lleva días: "0D" se lee como un fallo. */}
          {since > 0 ? `${since}D` : ""}
        </Meta>
      </Hatch>
    );
  }

  return (
    <Hatch
      color={alpha(c.signal, 0.3)}
      style={{
        borderLeftWidth: 3,
        borderLeftColor: c.signal,
        paddingHorizontal: 12,
        paddingVertical: 8,
        overflow: "hidden",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ color: c.signal, fontSize: 13 }}>✕</Text>
        <Meta variant="cintillo" tone="inherit" style={{ color: c.signal }}>
          {since > 0 ? t("blocker.blockedDays", { count: since }) : t("blocker.blocked")}
        </Meta>
      </View>
      {reason ? (
        <Text className="mt-1 text-sm text-text-2">{reason}</Text>
      ) : null}
      {blocksCount ? (
        <Meta variant="cintillo" tone="faint" className="mt-1">
          {t("blocker.blocksTasks", { count: blocksCount })}
        </Meta>
      ) : null}
    </Hatch>
  );
}
