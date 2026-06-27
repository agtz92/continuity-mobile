/**
 * Pantalla de analítica de la app móvil (Expo/React Native).
 * Agrupa ~9 paneles intercambiables por chip: cadencia, gráfico de actividad,
 * breakdown por estado/categoría, salud del backlog, heatmap por día de semana,
 * top proyectos, proyectos dormidos / ideas viejas, funnel de ideas y esfuerzo.
 * Los gráficos se dibujan a mano con react-native-svg (no hay lib de charts).
 *
 * TODO: refactor — extraer ActivityChart y un *Panel.tsx por gráfico + lib/analyticsConfig.ts (RANGES/CHIPS/buckets/STATUS_COLOR) (ver AUDITORIA_CODIGO.md)
 */
import { type ReactNode, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AlertCircle, BarChart3 } from "lucide-react-native";
import type { AnalyticsRange } from "@/lib/types";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { useThemeColors } from "@/theme/useThemeColors";
import { CHIPS, RANGES, type ChipId } from "@/lib/analyticsConfig";

import {
  AMBER,
  CadencePanel,
  ActivityChart,
  LoopPanel,
  StatusBreakdownPanel,
  BacklogPanel,
  WeekdayHeatmap,
  TopProjectsPanel,
  SleepingStalePanel,
  IdeaFunnelPanel,
  EffortPanel,
} from "@/components/analytics/panels";

export default function Analytics() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const [range, setRange] = useState<AnalyticsRange>("LAST_30_DAYS");
  const [activeChip, setActiveChip] = useState<ChipId>("activity");
  const { analytics, initialLoading, loading, error, refetch } = useAnalyticsData(range);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  // Mapea el chip activo a su panel concreto, inyectando el slice de datos que cada
  // uno necesita. Devuelve null si los datos aún no llegaron (estados de carga/error
  // los maneja el render principal).
  const renderPanel = (id: ChipId): ReactNode => {
    if (!analytics) return null;
    switch (id) {
      case "activity":
        return <ActivityChart series={analytics.activitySeries} t={t} />;
      case "loop":
        return <LoopPanel loop={analytics.loop} t={t} c={c} />;
      case "cadence":
        return <CadencePanel cadence={analytics.cadence} t={t} />;
      case "status":
        return (
          <StatusBreakdownPanel
            statusCounts={analytics.statusCounts}
            categoryBreakdown={analytics.categoryBreakdown}
            t={t}
            c={c}
          />
        );
      case "backlog":
        return <BacklogPanel backlog={analytics.backlog} t={t} c={c} />;
      case "weekday":
        return <WeekdayHeatmap heatmap={analytics.weekdayHeatmap} t={t} />;
      case "topProjects":
        return <TopProjectsPanel rows={analytics.topProjects} t={t} c={c} />;
      case "sleeping":
        return (
          <SleepingStalePanel
            sleeping={analytics.sleepingProjects}
            stale={analytics.staleIdeas}
            t={t}
          />
        );
      case "funnel":
        return <IdeaFunnelPanel funnel={analytics.ideaFunnel} t={t} c={c} />;
      case "effort":
        return <EffortPanel effort={analytics.effort} t={t} />;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="gap-3 px-5 pb-3 pt-2">
        <View className="flex-row items-center gap-2">
          <BarChart3 size={18} color={c.accent} />
          <Text className="text-2xl font-bold text-text">{t("analytics.title")}</Text>
          {loading && !initialLoading ? (
            <Text className="text-xs text-text-muted">{t("analytics.refreshing")}</Text>
          ) : null}
        </View>

        <View className="flex-row rounded-lg border border-border bg-surface p-0.5">
          {RANGES.map((r) => {
            const active = range === r.value;
            return (
              <Pressable
                key={r.value}
                onPress={() => setRange(r.value)}
                className={"flex-1 items-center rounded-md px-2 py-1.5 " + (active ? "bg-border" : "")}
              >
                <Text className={"text-xs font-medium " + (active ? "text-text" : "text-text-muted")}>
                  {t(`analytics.range.${r.key}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {initialLoading || (!analytics && !error) ? (
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-base text-text-muted">{t("analytics.calculating")}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ gap: 12, padding: 20, paddingTop: 4, paddingBottom: 96 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />
          }
        >
          {error && (
            <View
              className="flex-row items-start gap-3 rounded-xl border bg-surface p-4"
              style={{ borderColor: "rgba(245,158,11,0.3)" }}
            >
              <AlertCircle size={18} color={AMBER} style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="text-sm font-semibold" style={{ color: AMBER }}>
                  {t("analytics.loadError")}
                </Text>
                <Text className="mt-1 text-xs text-text-muted">{error.message}</Text>
                <Pressable
                  onPress={() => refetch()}
                  className="mt-3 self-start rounded-md bg-accent px-3 py-1.5"
                >
                  <Text className="text-xs font-medium text-bg">{t("common.retry")}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {analytics && (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-1.5 pb-1"
              >
                {CHIPS.map((id) => {
                  const active = activeChip === id;
                  return (
                    <Pressable
                      key={id}
                      onPress={() => setActiveChip(id)}
                      className={
                        "rounded-full border px-3 py-1.5 " +
                        (active ? "border-accent bg-accent" : "border-border bg-surface")
                      }
                    >
                      <Text
                        className={
                          "text-sm font-medium " + (active ? "text-bg" : "text-text-muted")
                        }
                      >
                        {t(`analytics.chips.${id}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {renderPanel(activeChip)}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
