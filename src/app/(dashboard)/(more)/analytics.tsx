import { Fragment, type ReactNode, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowRightCircle,
  ArrowUp,
  BarChart3,
  CalendarDays,
  Clock,
  Flame,
  Hourglass,
  Lightbulb,
  LineChart as LineIcon,
  Minus,
  MoonStar,
  PieChart as PieIcon,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react-native";
import Svg, {
  Circle,
  Line as SvgLine,
  Polyline,
  Text as SvgText,
} from "react-native-svg";
import type {
  AnalyticsRange,
  BacklogHealth,
  CadenceStats,
  CategoryRow,
  EffortStats,
  IdeaFunnel,
  ProjectInteractionRow,
  ProjectStatus,
  SleepingProjectRow,
  StaleIdeaRow,
  StatusCount,
  WeekdayBucket,
  ActivityPoint,
} from "@/lib/types";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import {
  alpha,
  categoryChipColors,
  useThemeColors,
  type ThemeColors,
} from "@/theme/useThemeColors";

const AMBER = "rgb(251,191,36)";
const ROSE = "rgb(251,113,133)";
const PURPLE = "rgb(192,132,252)";
const CYAN = "rgb(34,211,238)";
const INDIGO = "rgb(129,140,248)";
const PINK = "rgb(244,114,182)";
const ORANGE = "rgb(251,146,60)";
const YELLOW = "rgb(250,204,21)";
const EMERALD = "rgb(52,211,153)";
const BLUE = "rgb(96,165,250)";

type ChipId =
  | "activity"
  | "cadence"
  | "status"
  | "backlog"
  | "weekday"
  | "topProjects"
  | "sleeping"
  | "funnel"
  | "effort";

const CHIPS: ChipId[] = [
  "activity",
  "cadence",
  "status",
  "backlog",
  "weekday",
  "funnel",
  "effort",
  "topProjects",
  "sleeping",
];

const RANGES: { value: AnalyticsRange; key: "7d" | "30d" | "90d" | "1y" | "all" }[] = [
  { value: "LAST_7_DAYS", key: "7d" },
  { value: "LAST_30_DAYS", key: "30d" },
  { value: "LAST_90_DAYS", key: "90d" },
  { value: "LAST_365_DAYS", key: "1y" },
  { value: "ALL_TIME", key: "all" },
];

type T = (key: string, params?: Record<string, string | number>) => string;

function PanelCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View className="rounded-xl border border-border bg-surface p-4">
      <View className="mb-3">
        <View className="flex-row items-center gap-2">
          {icon}
          <Text className="text-sm font-semibold text-text">{title}</Text>
        </View>
        {subtitle ? (
          <Text className="mt-0.5 text-xs text-text-muted">{subtitle}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function StatTile({
  value,
  suffix,
  label,
  tone,
  icon,
}: {
  value: number | string;
  suffix?: string;
  label: string;
  tone?: string;
  icon?: ReactNode;
}) {
  return (
    <View className="flex-1 rounded-lg border border-border bg-bg p-3">
      {icon && (
        <View className="mb-1 flex-row items-center gap-1.5">
          {icon}
          <Text className="text-[11px] text-text-muted">{label}</Text>
        </View>
      )}
      <Text className="text-2xl font-semibold" style={tone ? { color: tone } : undefined}>
        <Text className="text-2xl font-semibold text-text" style={tone ? { color: tone } : undefined}>
          {value}
        </Text>
        {suffix ? <Text className="text-sm text-text-muted"> {suffix}</Text> : null}
      </Text>
      {!icon && <Text className="mt-1 text-xs text-text-muted">{label}</Text>}
    </View>
  );
}

function CadencePanel({ cadence, t }: { cadence: CadenceStats; t: T }) {
  return (
    <PanelCard title={t("analytics.cadence.title")} icon={<Flame size={16} color={AMBER} />}>
      <View className="gap-3">
        <View className="flex-row gap-3">
          <StatTile value={cadence.currentStreak} suffix="d" label={t("analytics.cadence.currentStreak")} />
          <StatTile value={cadence.longestStreak} suffix="d" label={t("analytics.cadence.bestStreak")} />
        </View>
        <View className="flex-row gap-3">
          <StatTile value={cadence.activeDaysInRange} label={t("analytics.cadence.activeDays")} />
          <StatTile value={cadence.totalActivityEvents} label={t("analytics.cadence.events")} />
        </View>
      </View>
    </PanelCard>
  );
}

function ActivityChart({ series, t }: { series: ActivityPoint[]; t: T }) {
  const c = useThemeColors();
  const [width, setWidth] = useState(0);
  const n = series.length;
  const max = Math.max(
    1,
    ...series.flatMap((p) => [p.updates, p.completedTasks])
  );

  const H = 180;
  const PAD_L = 26;
  const PAD_R = 10;
  const PAD_T = 12;
  const PAD_B = 22;
  const plotW = Math.max(0, width - PAD_L - PAD_R);
  const plotH = H - PAD_T - PAD_B;

  const xAt = (i: number) =>
    n <= 1 ? PAD_L + plotW / 2 : PAD_L + (i / (n - 1)) * plotW;
  const yAt = (v: number) => PAD_T + (1 - v / max) * plotH;

  const tickEvery = Math.max(1, Math.ceil(n / 7));
  const gridVals = max >= 2 ? [0, max / 2, max] : [0, max];

  const points = (key: "updates" | "completedTasks") =>
    series.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p[key]).toFixed(1)}`).join(" ");

  return (
    <PanelCard title={t("analytics.activityChart.title")} icon={<LineIcon size={16} color={EMERALD} />}>
      <View className="mb-3 flex-row gap-4">
        <View className="flex-row items-center gap-1.5">
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: EMERALD }} />
          <Text className="text-xs text-text-muted">{t("analytics.activityChart.updates")}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: BLUE }} />
          <Text className="text-xs text-text-muted">{t("analytics.activityChart.tasks")}</Text>
        </View>
      </View>
      {n === 0 ? (
        <Text className="py-4 text-sm text-text-muted">—</Text>
      ) : (
        <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: H }}>
          {width > 0 && (
            <Svg width={width} height={H}>
              {gridVals.map((gv, gi) => {
                const y = yAt(gv);
                return (
                  <Fragment key={gi}>
                    <SvgLine
                      x1={PAD_L}
                      y1={y}
                      x2={width - PAD_R}
                      y2={y}
                      stroke={c.border}
                      strokeWidth={1}
                      strokeDasharray="3 4"
                    />
                    <SvgText
                      x={PAD_L - 6}
                      y={y + 3}
                      fontSize={9}
                      fill={c.textMuted}
                      textAnchor="end"
                    >
                      {String(Math.round(gv))}
                    </SvgText>
                  </Fragment>
                );
              })}

              {series.map((p, i) => {
                if (i % tickEvery !== 0 && i !== n - 1) return null;
                const [, mo, dy] = p.day.slice(0, 10).split("-");
                const anchor = i === 0 ? "start" : i === n - 1 ? "end" : "middle";
                return (
                  <SvgText
                    key={p.day}
                    x={xAt(i)}
                    y={H - 6}
                    fontSize={9}
                    fill={c.textMuted}
                    textAnchor={anchor}
                  >
                    {`${Number(dy)}/${Number(mo)}`}
                  </SvgText>
                );
              })}

              {n === 1 ? (
                <>
                  <Circle cx={xAt(0)} cy={yAt(series[0].updates)} r={3.5} fill={EMERALD} />
                  <Circle cx={xAt(0)} cy={yAt(series[0].completedTasks)} r={3.5} fill={BLUE} />
                </>
              ) : (
                <>
                  <Polyline
                    points={points("updates")}
                    fill="none"
                    stroke={EMERALD}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  <Polyline
                    points={points("completedTasks")}
                    fill="none"
                    stroke={BLUE}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </>
              )}
            </Svg>
          )}
        </View>
      )}
    </PanelCard>
  );
}

function StatusBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View>
      <View className="mb-1 flex-row justify-between">
        <Text className="text-xs text-text-muted">{label}</Text>
        <Text className="text-xs text-text-muted">{count}</Text>
      </View>
      <View className="h-1.5 overflow-hidden rounded-full bg-border">
        <View style={{ height: "100%", width: `${pct}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

function StatusBreakdownPanel({
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
    "archived",
  ];
  const STATUS_COLOR: Record<ProjectStatus, string> = {
    idea: AMBER,
    active: c.accent,
    stalled: ROSE,
    paused: c.textMuted,
    launched: c.accent2,
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
          <Text className="text-[11px] uppercase tracking-wide text-text-muted">
            {t("analytics.statusBreakdown.status")}
          </Text>
          {statusCounts.length === 0 ? (
            <Text className="text-sm text-text-muted">{t("analytics.statusBreakdown.noData")}</Text>
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
          <Text className="text-[11px] uppercase tracking-wide text-text-muted">
            {t("analytics.statusBreakdown.category")}
          </Text>
          {categoryBreakdown.length === 0 ? (
            <Text className="text-sm text-text-muted">{t("analytics.statusBreakdown.noCategories")}</Text>
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
                  <Text className="flex-1 text-sm text-text" numberOfLines={1}>
                    {cat.name}
                  </Text>
                </View>
                <Text className="text-xs text-text-muted">
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

function BacklogPanel({ backlog, t, c }: { backlog: BacklogHealth; t: T; c: ThemeColors }) {
  return (
    <PanelCard
      title={t("analytics.backlog.title")}
      icon={<AlertTriangle size={16} color={AMBER} />}
      subtitle={t("analytics.backlog.subtitle", { count: backlog.openTasks })}
    >
      <View className="gap-3">
        <View className="flex-row gap-3">
          <StatTile
            value={backlog.overdueTasks}
            label={t("analytics.backlog.overdue")}
            tone={ROSE}
            icon={<AlertTriangle size={14} color={ROSE} />}
          />
          <StatTile
            value={backlog.dueSoonTasks}
            label={t("analytics.backlog.dueSoon")}
            tone={AMBER}
            icon={<Clock size={14} color={AMBER} />}
          />
        </View>
        <View className="flex-row gap-3">
          <StatTile
            value={backlog.quickWins}
            label={t("analytics.backlog.quickWins")}
            tone={c.accent}
            icon={<Target size={14} color={c.accent} />}
          />
          <StatTile
            value={backlog.almostThere}
            label={t("analytics.backlog.almostThere")}
            tone={c.accent2}
            icon={<Trophy size={14} color={c.accent2} />}
          />
        </View>
      </View>
    </PanelCard>
  );
}

function WeekdayHeatmap({ heatmap, t }: { heatmap: WeekdayBucket[]; t: T }) {
  const KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  const max = Math.max(1, ...heatmap.map((b) => b.count));
  const lookup = new Map(heatmap.map((b) => [b.weekday, b.count] as const));
  return (
    <PanelCard title={t("analytics.weekday.title")} icon={<CalendarDays size={16} color={PURPLE} />}>
      <View className="flex-row gap-2">
        {KEYS.map((key, i) => {
          const wd = i + 1;
          const count = lookup.get(wd) ?? 0;
          const intensity = count / max;
          const opacity = count === 0 ? 0.08 : 0.25 + intensity * 0.75;
          return (
            <View key={wd} className="flex-1 items-center gap-1.5">
              <View
                className="aspect-square w-full items-center justify-center rounded-md"
                style={{ backgroundColor: `rgba(52, 211, 153, ${opacity})` }}
              >
                <Text className="text-xs font-semibold text-text">{count}</Text>
              </View>
              <Text className="text-[10px] text-text-muted">
                {t(`analytics.weekday.labels.${key}`)}
              </Text>
            </View>
          );
        })}
      </View>
    </PanelCard>
  );
}

function Delta({ value, c }: { value: number; c: ThemeColors }) {
  if (value === 0) {
    return (
      <View className="flex-row items-center gap-0.5">
        <Minus size={12} color={c.textMuted} />
        <Text className="text-xs text-text-muted">0</Text>
      </View>
    );
  }
  if (value > 0) {
    return (
      <View className="flex-row items-center gap-0.5">
        <ArrowUp size={12} color={c.accent} />
        <Text className="text-xs text-accent">+{value}</Text>
      </View>
    );
  }
  return (
    <View className="flex-row items-center gap-0.5">
      <ArrowDown size={12} color={ROSE} />
      <Text className="text-xs" style={{ color: ROSE }}>
        {value}
      </Text>
    </View>
  );
}

function TopProjectsPanel({
  rows,
  t,
  c,
}: {
  rows: ProjectInteractionRow[];
  t: T;
  c: ThemeColors;
}) {
  return (
    <PanelCard
      title={t("analytics.topProjects.title")}
      icon={<TrendingUp size={16} color={c.accent2} />}
      subtitle={t("analytics.topProjects.subtitle")}
    >
      {rows.length === 0 ? (
        <Text className="py-4 text-sm text-text-muted">{t("analytics.topProjects.empty")}</Text>
      ) : (
        <View className="gap-2">
          {rows.map((r) => (
            <View
              key={r.projectId}
              className="flex-row items-center justify-between gap-3 rounded-lg border border-border bg-bg px-3 py-2"
            >
              <View className="min-w-0 flex-1">
                <Text className="text-sm text-text" numberOfLines={1}>
                  {r.name}
                </Text>
                <Text className="text-[11px] text-text-muted">{t(`status.${r.status}`)}</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Delta value={r.deltaVsPrev} c={c} />
                <Text className="text-base font-semibold text-text">{r.interactions}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </PanelCard>
  );
}

function SleepingStalePanel({
  sleeping,
  stale,
  t,
}: {
  sleeping: SleepingProjectRow[];
  stale: StaleIdeaRow[];
  t: T;
}) {
  const BUCKET: Record<SleepingProjectRow["bucket"], { base: string; text: string }> = {
    "7-14": { base: "245,158,11", text: AMBER },
    "15-30": { base: "249,115,22", text: ORANGE },
    "30+": { base: "244,63,94", text: ROSE },
  };
  return (
    <View className="gap-4">
      <PanelCard
        title={t("analytics.sleeping.title")}
        icon={<MoonStar size={16} color={INDIGO} />}
        subtitle={t("analytics.sleeping.subtitle")}
      >
        {sleeping.length === 0 ? (
          <Text className="py-4 text-sm text-text-muted">{t("analytics.sleeping.empty")}</Text>
        ) : (
          <View className="gap-2">
            {sleeping.map((s) => {
              const tone = BUCKET[s.bucket];
              return (
                <View
                  key={s.projectId}
                  className="flex-row items-center justify-between gap-3 rounded-lg border border-border bg-bg px-3 py-2"
                >
                  <Text className="min-w-0 flex-1 text-sm text-text" numberOfLines={1}>
                    {s.name}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <View
                      className="rounded border px-1.5 py-0.5"
                      style={{
                        backgroundColor: `rgba(${tone.base},0.15)`,
                        borderColor: `rgba(${tone.base},0.3)`,
                      }}
                    >
                      <Text className="text-[10px]" style={{ color: tone.text }}>
                        {s.bucket}d
                      </Text>
                    </View>
                    <Text className="text-xs text-text-muted">{s.daysIdle}d</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </PanelCard>

      <PanelCard
        title={t("analytics.stale.title")}
        icon={<Lightbulb size={16} color={YELLOW} />}
        subtitle={t("analytics.stale.subtitle")}
      >
        {stale.length === 0 ? (
          <Text className="py-4 text-sm text-text-muted">{t("analytics.stale.empty")}</Text>
        ) : (
          <View className="gap-2">
            {stale.map((s) => (
              <View
                key={s.ideaId}
                className="flex-row items-center justify-between gap-3 rounded-lg border border-border bg-bg px-3 py-2"
              >
                <Text className="min-w-0 flex-1 text-sm text-text" numberOfLines={1}>
                  {s.title}
                </Text>
                <Text className="text-xs text-text-muted">{s.daysOld}d</Text>
              </View>
            ))}
          </View>
        )}
      </PanelCard>
    </View>
  );
}

function IdeaFunnelPanel({ funnel, t, c }: { funnel: IdeaFunnel; t: T; c: ThemeColors }) {
  const pct = Math.round(funnel.promotionRate * 100);
  return (
    <PanelCard
      title={t("analytics.ideaFunnel.title")}
      icon={<ArrowRightCircle size={16} color={PINK} />}
      subtitle={t("analytics.ideaFunnel.subtitle")}
    >
      <View className="flex-row gap-3">
        <View className="flex-1 rounded-lg border border-border bg-bg p-3">
          <Text className="text-2xl font-semibold text-text">{funnel.ideasCreated}</Text>
          <Text className="mt-1 text-xs text-text-muted">{t("analytics.ideaFunnel.created")}</Text>
        </View>
        <View className="flex-1 rounded-lg border border-border bg-bg p-3">
          <Text className="text-2xl font-semibold" style={{ color: c.accent }}>
            {funnel.ideasPromoted}
          </Text>
          <Text className="mt-1 text-xs text-text-muted">{t("analytics.ideaFunnel.promoted")}</Text>
        </View>
        <View className="flex-1 rounded-lg border border-border bg-bg p-3">
          <Text className="text-2xl font-semibold text-text">
            {pct}
            <Text className="text-sm text-text-muted">%</Text>
          </Text>
          <Text className="mt-1 text-xs text-text-muted">{t("analytics.ideaFunnel.rate")}</Text>
        </View>
      </View>
    </PanelCard>
  );
}

function EffortPanel({ effort, t }: { effort: EffortStats; t: T }) {
  const coverage = Math.round(effort.tasksWithEffortPct * 100);
  const subtitle = coverage >= 100 ? undefined : t("analytics.effort.subtitle", { coverage });
  return (
    <PanelCard
      title={t("analytics.effort.title")}
      icon={<Hourglass size={16} color={ORANGE} />}
      subtitle={subtitle}
    >
      <View className="mb-4 flex-row items-baseline gap-2">
        <Text className="text-3xl font-semibold text-text">{effort.effortHoursTotal}</Text>
        <Text className="text-sm text-text-muted">{t("analytics.effort.totalHoursSuffix")}</Text>
      </View>
      {effort.effortHoursByProject.length === 0 ? (
        <Text className="text-sm text-text-muted">{t("analytics.effort.empty")}</Text>
      ) : (
        <View className="gap-1.5">
          {effort.effortHoursByProject.map((row) => (
            <View key={row.projectId} className="flex-row items-center justify-between gap-3">
              <Text className="min-w-0 flex-1 text-sm text-text" numberOfLines={1}>
                {row.name}
              </Text>
              <Text className="text-sm text-text-muted">{row.hours} h</Text>
            </View>
          ))}
        </View>
      )}
    </PanelCard>
  );
}

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

  const renderPanel = (id: ChipId): ReactNode => {
    if (!analytics) return null;
    switch (id) {
      case "activity":
        return <ActivityChart series={analytics.activitySeries} t={t} />;
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
          <Text className="text-text-muted">{t("analytics.calculating")}</Text>
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
