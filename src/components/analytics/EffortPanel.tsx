import { Text, View } from "react-native";
import { Hourglass } from "lucide-react-native";
import type { EffortStats } from "@/lib/types";
import { PanelCard, ORANGE, type T } from "./panels";

export function EffortPanel({ effort, t }: { effort: EffortStats; t: T }) {
  const coverage = Math.round(effort.tasksWithEffortPct * 100);
  const subtitle = coverage >= 100 ? undefined : t("analytics.effort.subtitle", { coverage });
  return (
    <PanelCard
      title={t("analytics.effort.title")}
      icon={<Hourglass size={16} color={ORANGE} />}
      subtitle={subtitle}
    >
      <View className="mb-4 flex-row items-baseline gap-2">
        <Text className="text-3xl font-sans-semibold text-text">{effort.effortHoursTotal}</Text>
        <Text className="font-sans text-sm text-text-muted">{t("analytics.effort.totalHoursSuffix")}</Text>
      </View>
      {effort.effortHoursByProject.length === 0 ? (
        <Text className="font-sans text-sm text-text-muted">{t("analytics.effort.empty")}</Text>
      ) : (
        <View className="gap-1.5">
          {effort.effortHoursByProject.map((row) => (
            <View key={row.projectId} className="flex-row items-center justify-between gap-3">
              <Text className="font-sans min-w-0 flex-1 text-sm text-text" numberOfLines={1}>
                {row.name}
              </Text>
              <Text className="font-sans text-sm text-text-muted">{row.hours} h</Text>
            </View>
          ))}
        </View>
      )}
    </PanelCard>
  );
}

/**
 * Componente raíz de la pantalla. Maneja el rango temporal y el chip activo, dispara
 * la carga vía useAnalyticsData(range) y pull-to-refresh. Solo se muestra un panel a
 * la vez (el del chip activo) para no saturar la vista móvil ni recalcular todos.
 */
