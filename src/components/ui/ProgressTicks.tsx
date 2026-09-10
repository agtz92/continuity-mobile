import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { useThemeColors } from "@/theme/useThemeColors";
import { Meta } from "./Meta";

/** Por encima de esto los bloques dejan de ser contables. */
const MAX_TICKS = 20;

/**
 * Progreso en bloques, no en barra continua: **cada marca es una tarea**, así
 * que se pueden contar. Las bloqueadas se pintan con la señal, de modo que "7
 * de 12, y tres de las que faltan están detenidas" se lee de un vistazo.
 *
 * Por encima de `MAX_TICKS` cae a barra proporcional — a 390px un bloque de 8px
 * dejaría de caber en la fila.
 */
export function ProgressTicks({
  done,
  total,
  blocked = 0,
  showLabel = true,
}: {
  done: number;
  total: number;
  /** Tareas abiertas con blocker. Se pintan aparte de las pendientes. */
  blocked?: number;
  showLabel?: boolean;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  if (total <= 0) return null;

  const pct = Math.round((done / total) * 100);
  const label = (
    <Meta tone="faint">{t("progressTicks.label", { done, total, pct })}</Meta>
  );

  if (total > MAX_TICKS) {
    return (
      <View className="flex-row items-center gap-2">
        <View
          style={{ height: 5, flex: 1, backgroundColor: c.line[8] }}
          accessibilityRole="progressbar"
          accessibilityLabel={t("progressTicks.aria", { done, total })}
        >
          <View
            style={{ height: 5, width: `${pct}%`, backgroundColor: c.accent }}
          />
        </View>
        {showLabel ? label : null}
      </View>
    );
  }

  const blockedOpen = Math.min(blocked, Math.max(total - done, 0));
  return (
    <View className="flex-row items-center gap-2">
      <View
        className="flex-row"
        style={{ gap: 2 }}
        accessibilityRole="progressbar"
        accessibilityLabel={
          blockedOpen
            ? t("progressTicks.ariaBlocked", { done, total, blocked: blockedOpen })
            : t("progressTicks.aria", { done, total })
        }
      >
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 8,
              height: 5,
              backgroundColor:
                i < done
                  ? c.accent
                  : i < done + blockedOpen
                    ? c.signal
                    : c.line[14],
            }}
          />
        ))}
      </View>
      {showLabel ? label : null}
    </View>
  );
}
