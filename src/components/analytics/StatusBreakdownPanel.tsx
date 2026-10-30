import { Text, View } from "react-native";
import { PieChart as PieIcon } from "lucide-react-native";
import type { CategoryRow, ProjectStatus, StatusCount } from "@/lib/types";
import { categoryChipColors, type ThemeColors } from "@/theme/useThemeColors";
import { PanelCard, StatusBar, AMBER, ROSE, CYAN, RED, type T } from "./panels";

/** Panel doble: distribución de proyectos por estado (barras) y por categoría (filas
 *  con punto de color). STATUS_ORDER fija un orden semántico estable (idea→archived)
 *  en lugar del orden con que lleguen los datos; los estados con conteo 0 se omiten. */
export function StatusBreakdownPanel({
  statusCounts,
  categoryBreakdown,
  t,
  c,
}: {
  statusCounts: StatusCount[];
  categoryBreakdown: CategoryRow[];
  t: T;
  c: ThemeColors;
}) {
  const total = statusCounts.reduce((acc, s) => acc + s.count, 0);
  const STATUS_ORDER: ProjectStatus[] = [
    "idea",
    "active",
    "stalled",
    "paused",
    "launched",
    "killed",
    "archived",
  ];
  // Color por estado: algunos salen del tema (active/launched/muted) para respetar la
  // paleta del usuario; killed es rojo fijo porque ningún acento del tema comunica
  // "matado" de forma fiable.
  const STATUS_COLOR: Record<ProjectStatus, string> = {
    idea: AMBER,
    active: c.accent,
    stalled: ROSE,
    paused: c.textMuted,
    launched: c.accent2,
    killed: RED,
    archived: c.textMuted,
  };
  return (
    <PanelCard
      title={t("analytics.statusBreakdown.title")}
      icon={<PieIcon size={16} color={CYAN} />}
      subtitle={t("analytics.statusBreakdown.subtitle", { count: total })}
    >
      <View className="gap-5">
        <View className="gap-2.5">
          <Text className="font-sans text-[11px] uppercase tracking-wide text-text-muted">
            {t("analytics.statusBreakdown.status")}
          </Text>
          {statusCounts.length === 0 ? (
            <Text className="font-sans text-sm text-text-muted">{t("analytics.statusBreakdown.noData")}</Text>
          ) : (
            STATUS_ORDER.map((s) => {
              const row = statusCounts.find((x) => x.status === s);
              if (!row || row.count === 0) return null;
              return (
                <StatusBar
                  key={s}
                  label={t(`status.${s}`)}
                  count={row.count}
                  total={total}
                  color={STATUS_COLOR[s]}
                />
              );
            })
          )}
        </View>
        <View className="gap-2.5">
          <Text className="font-sans text-[11px] uppercase tracking-wide text-text-muted">
            {t("analytics.statusBreakdown.category")}
          </Text>
          {categoryBreakdown.length === 0 ? (
            <Text className="font-sans text-sm text-text-muted">{t("analytics.statusBreakdown.noCategories")}</Text>
          ) : (
            categoryBreakdown.map((cat) => (
              <View
                key={cat.categoryId ?? "none"}
                className="flex-row items-center justify-between gap-3"
              >
                <View className="min-w-0 flex-1 flex-row items-center gap-2">
                  <View
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: categoryChipColors(cat.color, c).dot }}
                  />
                  <Text className="font-sans flex-1 text-sm text-text" numberOfLines={1}>
                    {cat.name}
                  </Text>
                </View>
                <Text className="font-sans text-xs text-text-muted">
                  {t("analytics.statusBreakdown.rowMeta", {
                    projects: cat.projectCount,
                    interactions: cat.interactions,
                  })}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </PanelCard>
  );
}
