import { Pressable, Text, View } from "react-native";
import { Clock, Rocket, Sparkles } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { Category, Project, Task } from "@/lib/types";
import { priorityStripeClass } from "@/lib/priority";
import { daysSince, isDueToday, isOverdue } from "@/lib/date";
import { alpha, categoryChipColors, useThemeColors } from "@/theme/useThemeColors";

const RED = "239,68,68"; // red-500
const ORANGE = "249,115,22"; // orange-500

/**
 * Compact, tappable project card. Mirrors the web card used in Today's grids;
 * here it's also the list item on the Projects screen. Variants differ in tint
 * (launched gets an accent-2 wash), header lead (priority dot vs Rocket),
 * footer ("Xd ago" only for active), and a launched-only "X open" badge.
 */
export function ProjectCardCompact({
  project: p,
  projectTasks,
  variant,
  categoryById,
  totalEffortHours,
  todayEffortHours,
  comebackGapDays,
  onPress,
}: {
  project: Project;
  projectTasks: Task[];
  variant: "active" | "launched";
  categoryById: Record<string, Category>;
  totalEffortHours?: number;
  todayEffortHours?: number;
  comebackGapDays?: number | null;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const done = projectTasks.filter((tk) => tk.done).length;
  const total = projectTasks.length;
  const todayCount = projectTasks.filter(
    (tk) => !tk.done && isDueToday(tk.dueDate)
  ).length;
  const overdueCount = projectTasks.filter(
    (tk) => !tk.done && isOverdue(tk.dueDate)
  ).length;
  const openCount = projectTasks.filter((tk) => !tk.done).length;
  const days = daysSince(p.lastActivity) ?? 0;
  const donePct = total === 0 ? 0 : Math.round((done / total) * 100);

  const borderColor =
    overdueCount > 0
      ? `rgba(${RED},0.4)`
      : todayCount > 0
      ? `rgba(${ORANGE},0.4)`
      : variant === "launched"
      ? alpha(c.accent2, 0.2)
      : c.border;
  const backgroundColor =
    variant === "launched" ? alpha(c.accent2, 0.05) : c.surface;

  const cat = p.categoryId ? categoryById[p.categoryId] : undefined;
  const catColors = cat ? categoryChipColors(cat.color, c) : null;

  const fillColor =
    donePct >= 80 ? c.accent : donePct >= 40 ? c.accent2 : c.textMuted;

  return (
    <Pressable
      onPress={onPress}
      className="rounded-xl border p-4 active:opacity-90"
      style={{ borderColor, backgroundColor }}
    >
      <View className="mb-1 flex-row flex-wrap items-center gap-2">
        {variant === "launched" ? (
          <Rocket size={14} color={c.accent2} />
        ) : (
          <View className={`h-2.5 w-2.5 rounded-full ${priorityStripeClass[p.priority]}`} />
        )}
        <Text numberOfLines={1} className="text-base flex-1 font-semibold text-text">
          {p.name}
        </Text>
        {comebackGapDays != null && comebackGapDays > 0 && (
          <View
            className="flex-row items-center gap-1 rounded border px-1.5 py-0.5"
            style={{
              backgroundColor: alpha(c.accent, 0.2),
              borderColor: alpha(c.accent, 0.4),
            }}
          >
            <Sparkles size={10} color={c.accent} />
            <Text className="text-xs text-accent">
              {t("projectCard.comebackBadge", { days: comebackGapDays })}
            </Text>
          </View>
        )}
        {variant === "launched" && (
          <View
            className="rounded border px-1.5 py-0.5"
            style={{
              backgroundColor: alpha(c.accent2, 0.2),
              borderColor: alpha(c.accent2, 0.4),
            }}
          >
            <Text className="text-xs text-accent-2">
              {t("projectCard.openCount", { count: openCount })}
            </Text>
          </View>
        )}
        {overdueCount > 0 && (
          <View
            className="rounded border px-1.5 py-0.5"
            style={{
              backgroundColor: `rgba(${RED},0.2)`,
              borderColor: `rgba(${RED},0.4)`,
            }}
          >
            <Text className="text-xs" style={{ color: `rgb(${RED})` }}>
              {t("projectCard.overdueBadge", { count: overdueCount })}
            </Text>
          </View>
        )}
        {todayCount > 0 && (
          <View
            className="rounded border px-1.5 py-0.5"
            style={{
              backgroundColor: `rgba(${ORANGE},0.2)`,
              borderColor: `rgba(${ORANGE},0.4)`,
            }}
          >
            <Text className="text-xs" style={{ color: `rgb(${ORANGE})` }}>
              {t("projectCard.todayBadge", { count: todayCount })}
            </Text>
          </View>
        )}
      </View>

      {cat && catColors && (
        <View className="mb-2 self-start rounded border px-2 py-0.5" style={{ backgroundColor: catColors.bg, borderColor: catColors.border }}>
          <Text className="text-xs" style={{ color: catColors.text }}>
            {cat.name}
          </Text>
        </View>
      )}

      {!!p.nextStep && (
        <Text numberOfLines={2} className="mb-3 text-sm text-text-muted">
          → {p.nextStep}
        </Text>
      )}

      {total > 0 && (
        <View className="mb-2">
          <View className="h-1.5 overflow-hidden rounded-full bg-border">
            <View
              className="h-full rounded-full"
              style={{ width: `${donePct}%`, backgroundColor: fillColor }}
            />
          </View>
          <View className="mt-0.5 flex-row justify-between">
            <Text className="text-[10px] text-text-muted">
              {t("projectCard.donePct", { pct: donePct })}
            </Text>
            <Text className="text-[10px] text-text-muted">
              {done}/{total}
            </Text>
          </View>
        </View>
      )}

      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <View className="flex-row flex-wrap items-center gap-2">
          {todayEffortHours != null && todayEffortHours > 0 && (
            <View
              className="flex-row items-center gap-1 rounded border px-1.5 py-0.5"
              style={{
                backgroundColor: alpha(c.accent, 0.15),
                borderColor: alpha(c.accent, 0.3),
              }}
            >
              <Clock size={10} color={c.accent} />
              <Text className="text-xs text-accent">
                {t("projectCard.todayHoursLabel", { hours: todayEffortHours })}
              </Text>
            </View>
          )}
          {totalEffortHours != null && totalEffortHours > 0 && (
            <View className="flex-row items-center gap-1">
              <Clock size={10} color={c.textMuted} />
              <Text className="text-xs text-text-muted">
                {t("projectCard.totalHoursLabel", { hours: totalEffortHours })}
              </Text>
            </View>
          )}
        </View>
        {variant === "active" && (
          <Text
            className="text-xs"
            style={days > 6 ? { color: "rgb(251,191,36)" } : { color: c.textMuted }}
          >
            {t("projectCard.daysAgo", { days })}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
