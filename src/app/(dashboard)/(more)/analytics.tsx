/**
 * Pantalla de analítica (3e). Titular con el rango ("Last 30 days") + botón
 * Range (hoja), `FilterChips` para elegir panel. El panel "Activity" abre con
 * las cifras del rango, la gráfica de línea y "Most touched"; el resto de
 * paneles vive en `components/analytics/<Panel>.tsx` (uno por archivo; piezas
 * compartidas y colores de serie en `panels.tsx`), dibujados a mano con
 * react-native-svg (no hay lib de charts).
 */
import { useMemo, useState, type ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AlertCircle, ChevronDown } from "lucide-react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { FilterChips, type FilterChipItem } from "@/components/ui/FilterChips";
import { Meta } from "@/components/ui/Meta";
import { ScreenHeadline } from "@/components/ui/ScreenHeadline";
import { SheetRow } from "@/components/more/SheetRow";
import { MostTouched, RangeFigures } from "@/components/analytics/ActivitySummary";
import { ActivityChart } from "@/components/analytics/ActivityChart";
import { BacklogPanel } from "@/components/analytics/BacklogPanel";
import { CadencePanel } from "@/components/analytics/CadencePanel";
import { EffortPanel } from "@/components/analytics/EffortPanel";
import { IdeaFunnelPanel } from "@/components/analytics/IdeaFunnelPanel";
import { LoopPanel } from "@/components/analytics/LoopPanel";
import { SleepingStalePanel } from "@/components/analytics/SleepingStalePanel";
import { StatusBreakdownPanel } from "@/components/analytics/StatusBreakdownPanel";
import { TopProjectsPanel } from "@/components/analytics/TopProjectsPanel";
import { WeekdayHeatmap } from "@/components/analytics/WeekdayHeatmap";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { CHIPS, RANGES, type ChipId } from "@/lib/analyticsConfig";
import type { AnalyticsRange } from "@/lib/types";
import { SIZE } from "@/theme/tokens";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

export default function Analytics() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const [range, setRange] = useState<AnalyticsRange>("LAST_30_DAYS");
  const [activeChip, setActiveChip] = useState<ChipId>("activity");
  const [rangeOpen, setRangeOpen] = useState(false);
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

  const rangeKey = RANGES.find((r) => r.value === range)?.key ?? "30d";
  const chips = useMemo<FilterChipItem<ChipId>[]>(
    () => CHIPS.map((id) => ({ key: id, label: t(`analytics.chips.${id}`) })),
    [t],
  );

  // Panel concreto del chip activo, con el slice de datos que necesita.
  const renderPanel = (id: ChipId): ReactNode => {
    if (!analytics) return null;
    switch (id) {
      case "activity":
        return (
          <View style={{ gap: 24 }}>
            <RangeFigures series={analytics.activitySeries} t={t} />
            <ActivityChart series={analytics.activitySeries} t={t} />
            <MostTouched rows={analytics.topProjects} t={t} />
          </View>
        );
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
          <SleepingStalePanel sleeping={analytics.sleepingProjects} stale={analytics.staleIdeas} t={t} />
        );
      case "funnel":
        return <IdeaFunnelPanel funnel={analytics.ideaFunnel} t={t} c={c} />;
      case "effort":
        return <EffortPanel effort={analytics.effort} t={t} />;
    }
  };

  const rangeButton = (
    <Pressable
      onPress={() => setRangeOpen(true)}
      accessibilityRole="button"
      accessibilityLabel={t("analytics.rangeButton")}
      className="flex-row items-center rounded-md active:opacity-70"
      style={{
        height: SIZE.hit,
        paddingHorizontal: 14,
        gap: 6,
        borderWidth: 1,
        borderColor: c.line[18],
        backgroundColor: c.surface,
      }}
    >
      <Text
        className="font-sans-semibold uppercase"
        style={{ fontSize: 11, letterSpacing: 0.8, color: c.text3 }}
      >
        {t("analytics.rangeButton")}
      </Text>
      <ChevronDown size={16} color={c.text3} />
    </Pressable>
  );

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: SIZE.gutter, paddingTop: 8, paddingBottom: 96, gap: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />
        }
      >
        <View style={{ gap: 4 }}>
          <ScreenHeadline primary={t(`analytics.rangeLong.${rangeKey}`)} right={rangeButton} />
          {loading && !initialLoading ? (
            <Meta tone="faint">{t("analytics.refreshing")}</Meta>
          ) : null}
        </View>

        <FilterChips items={chips} value={activeChip} onChange={setActiveChip} />

        {initialLoading || (!analytics && !error) ? (
          <Text className="font-sans py-10 text-center" style={{ fontSize: 15, color: c.text3 }}>
            {t("analytics.calculating")}
          </Text>
        ) : null}

        {error ? (
          <View
            className="flex-row items-start rounded-lg"
            style={{ gap: 12, padding: 16, borderWidth: 1, borderColor: alpha(c.signal, 0.3), backgroundColor: c.surface }}
          >
            <AlertCircle size={18} color={c.signal} style={{ marginTop: 2 }} />
            <View className="flex-1">
              <Text className="font-sans-semibold" style={{ fontSize: 15, color: c.signal }}>
                {t("analytics.loadError")}
              </Text>
              <Text className="font-sans mt-1" style={{ fontSize: 13, color: c.text3 }}>
                {error.message}
              </Text>
              <Pressable
                onPress={() => refetch()}
                accessibilityRole="button"
                className="mt-3 items-center justify-center self-start rounded-md bg-accent px-4"
                style={{ height: SIZE.chip }}
              >
                <Text className="font-sans-semibold text-bg" style={{ fontSize: 15 }}>
                  {t("common.retry")}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {renderPanel(activeChip)}
      </ScrollView>

      <BottomSheet visible={rangeOpen} onClose={() => setRangeOpen(false)} title={t("analytics.rangeButton")}>
        {RANGES.map((r) => (
          <SheetRow
            key={r.value}
            label={t(`analytics.rangeLong.${r.key}`)}
            selected={range === r.value}
            onPress={() => {
              setRange(r.value);
              setRangeOpen(false);
            }}
          />
        ))}
      </BottomSheet>
    </View>
  );
}
