import { memo } from "react";
import { Text, View } from "react-native";

import { Meta } from "@/components/ui/Meta";
import type { ActivityPoint, ProjectInteractionRow } from "@/lib/types";
import { useThemeColors } from "@/theme/useThemeColors";

type T = (key: string, params?: Record<string, string | number>) => string;

/** Cifra de 36 px con espina de 3 px y etiqueta en versalitas. */
function SpineFigure({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  const c = useThemeColors();
  return (
    <View
      className="flex-1"
      accessible
      accessibilityLabel={`${value} ${label}`}
      style={{ borderLeftWidth: 3, borderLeftColor: accent ? c.accent : c.line[22], paddingLeft: 12 }}
    >
      <Text
        className="font-display"
        style={{
          fontSize: 36,
          lineHeight: 40,
          letterSpacing: -1,
          color: accent ? c.accent : c.text,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
      <Meta variant="cintillo" tone="muted" className="mt-1">
        {label}
      </Meta>
    </View>
  );
}

/**
 * Cifras del rango (3e) sumadas de `activitySeries`. Solo las que el backend
 * da: tareas hechas y updates. El diseño trae "notes" y deltas "vs prior",
 * pero no hay conteo de notas ni periodo previo para estas cifras: se omiten
 * en vez de inventarlos.
 */
export const RangeFigures = memo(function RangeFigures({
  series,
  t,
}: {
  series: ActivityPoint[];
  t: T;
}) {
  let done = 0;
  let updates = 0;
  for (const p of series) {
    done += p.completedTasks;
    updates += p.updates;
  }
  return (
    <View className="flex-row" style={{ gap: 16 }}>
      <SpineFigure value={done} label={t("analytics.figures.tasksDone")} accent />
      <SpineFigure value={updates} label={t("analytics.activityChart.updates")} />
    </View>
  );
});

/**
 * "Most touched": filas con barra de 6 px proporcional a las interacciones
 * (updates + tareas completadas) y la cifra a la derecha.
 */
export const MostTouched = memo(function MostTouched({
  rows,
  t,
}: {
  rows: ProjectInteractionRow[];
  t: T;
}) {
  const c = useThemeColors();
  if (rows.length === 0) return null;
  const max = Math.max(1, ...rows.map((r) => r.interactions));
  return (
    <View>
      <Meta variant="cintillo" tone="muted" className="mb-2">
        {t("analytics.figures.mostTouched")}
      </Meta>
      <View style={{ borderTopWidth: 1, borderTopColor: c.line[14] }}>
        {rows.map((r) => (
          <View
            key={r.projectId}
            accessible
            accessibilityLabel={`${r.name}: ${r.interactions}`}
            className="flex-row items-center"
            style={{ minHeight: 48, paddingVertical: 8, gap: 12, borderBottomWidth: 1, borderBottomColor: c.line[14] }}
          >
            <Text className="font-sans flex-1" style={{ fontSize: 16, lineHeight: 21, color: c.text }}>
              {r.name}
            </Text>
            <View style={{ width: 110, height: 6, borderRadius: 3, backgroundColor: c.line[10] }}>
              <View
                style={{
                  width: `${Math.max(4, Math.round((r.interactions / max) * 100))}%`,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: c.accent,
                }}
              />
            </View>
            <Text
              className="font-sans-semibold"
              style={{ width: 32, textAlign: "right", fontSize: 15, color: c.text, fontVariant: ["tabular-nums"] }}
            >
              {r.interactions}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});
