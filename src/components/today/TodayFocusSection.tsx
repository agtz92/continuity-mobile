import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { CheckCircle2, ChevronRight, Clock, Target } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import type { Project, Task } from "@/lib/types";
import { daysOverdue, daysSince } from "@/lib/date";
import { alpha, useThemeColors } from "@/theme/useThemeColors";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import type { useTodayFocus } from "@/hooks/useTodayFocus";
import { EffortBadge } from "./EffortBadge";
import { RED, RED_T, ORANGE, ORANGE_T, AMBER, AMBER_T } from "./todayColors";

type FocusModel = ReturnType<typeof useTodayFocus>;

interface TodayFocusSectionProps {
  todayFocus: FocusModel["todayFocus"];
  todayTaskCounts: FocusModel["todayTaskCounts"];
  todayEffortHours: number;
  projects: Project[];
  toggleTask: (t: Task) => void | Promise<void>;
  jumpToProject: (id: string) => void;
}

/**
 * "Enfoque de hoy" (mobile): lista priorizada de qué atender (overdue / due
 * today / stalled / next step). Extraída de today.tsx (ver AUDITORIA_CODIGO.md);
 * JSX verbatim, estado de plegado local, datos/callbacks por props.
 */
export function TodayFocusSection({
  todayFocus,
  todayTaskCounts,
  todayEffortHours,
  projects,
  toggleTask,
  jumpToProject,
}: TodayFocusSectionProps) {
  const [showTodayFocus, setShowTodayFocus] = useState(true);
  const { t } = useTranslation();
  const c = useThemeColors();
  const router = useRouter();

  const focusTypeColor = (type: string) =>
    type === "overdue"
      ? RED_T
      : type === "today"
      ? ORANGE_T
      : type === "stalled"
      ? AMBER_T
      : c.accent;
  const focusBorder = (type: string) =>
    type === "overdue"
      ? `rgba(${RED},0.3)`
      : type === "today"
      ? `rgba(${ORANGE},0.3)`
      : type === "stalled"
      ? `rgba(${AMBER},0.3)`
      : c.border;

  return (
    <CollapsibleSection
      open={showTodayFocus}
      onToggle={() => setShowTodayFocus((s) => !s)}
      icon={<Target size={18} color={c.accent} />}
      title={t("views.today.focus.title")}
      rightSlot={
        todayTaskCounts.total > 0 ? (
          <View className="flex-row flex-wrap items-center gap-2">
            <View
              className="flex-row items-center gap-1.5 rounded-full border px-2.5 py-1"
              style={{
                backgroundColor: `rgba(${ORANGE},0.2)`,
                borderColor: `rgba(${ORANGE},0.4)`,
              }}
            >
              <Target size={11} color={ORANGE_T} />
              <Text className="text-xs font-medium" style={{ color: ORANGE_T }}>
                {t("views.today.focus.tasksLabel", {
                  count: todayTaskCounts.total,
                })}
              </Text>
              {todayTaskCounts.overdue > 0 && (
                <Text className="text-xs font-semibold" style={{ color: RED_T }}>
                  {t("views.today.focus.overdueExtra", {
                    count: todayTaskCounts.overdue,
                  })}
                </Text>
              )}
            </View>
            {todayEffortHours > 0 && (
              <View
                className="flex-row items-center gap-1 rounded-full border px-2.5 py-1"
                style={{
                  backgroundColor: alpha(c.accent2, 0.15),
                  borderColor: alpha(c.accent2, 0.4),
                }}
              >
                <Clock size={11} color={c.accent2} />
                <Text className="text-xs font-medium text-accent-2">
                  {t("views.today.focus.totalHoursLabel", {
                    hours: todayEffortHours,
                  })}
                </Text>
              </View>
            )}
          </View>
        ) : null
      }
    >
      {todayFocus.items.length === 0 ? (
        <View className="items-center rounded-xl border border-border bg-surface p-8">
          <Text className="text-base mb-3 text-text-muted">
            {t("views.today.focus.emptyTitle")}
          </Text>
          <Text className="text-center text-sm text-text-muted">
            {projects.length === 0
              ? t("views.today.focus.emptyHintFirst")
              : t("views.today.focus.emptyHintNext")}
          </Text>
        </View>
      ) : (
        <View className="gap-3">
          {todayFocus.items.map((item, idx) => {
            const late =
              item.type === "overdue" && item.task?.dueDate
                ? daysOverdue(item.task.dueDate)
                : null;
            return (
              <View
                key={idx}
                className="rounded-xl border bg-surface p-4"
                style={{ borderColor: focusBorder(item.type) }}
              >
                <View className="flex-row items-center gap-3">
                  {item.task && (
                    <Pressable
                      onPress={() => toggleTask(item.task!)}
                      accessibilityLabel={t("views.today.focus.markDone")}
                      hitSlop={8}
                    >
                      <CheckCircle2 size={20} color={c.textMuted} />
                    </Pressable>
                  )}
                  <Pressable
                    className="min-w-0 flex-1"
                    onPress={
                      item.project
                        ? () => jumpToProject(item.project!.id)
                        : undefined
                    }
                    disabled={!item.project}
                  >
                    <View className="mb-1 flex-row flex-wrap items-center gap-2">
                      <Text
                        className="text-xs font-medium uppercase tracking-wider"
                        style={{ color: focusTypeColor(item.type) }}
                      >
                        {t(
                          item.type === "today"
                            ? "views.today.focus.labels.dueToday"
                            : item.type === "overdue"
                            ? "views.today.focus.labels.overdue"
                            : item.type === "stalled"
                            ? "views.today.focus.labels.stalled"
                            : "views.today.focus.labels.nextStep"
                        )}
                      </Text>
                      {late !== null && (
                        <View
                          className="rounded border px-1.5 py-0.5"
                          style={{
                            backgroundColor: `rgba(${RED},0.25)`,
                            borderColor: `rgba(${RED},0.5)`,
                          }}
                        >
                          <Text
                            className="text-[10px] font-semibold"
                            style={{ color: RED_T }}
                          >
                            {t("views.today.focus.daysLate", { count: late })}
                          </Text>
                        </View>
                      )}
                      {item.project && (
                        <Text className="text-xs text-text-muted">
                          · {item.project.name}
                        </Text>
                      )}
                    </View>
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text className="text-base text-text">
                        {item.task
                          ? item.task.title
                          : item.type === "stalled" && item.project
                          ? t("views.today.focus.daysIdleLine", {
                              name: item.project.name,
                              count: daysSince(item.project.lastActivity) ?? 0,
                            })
                          : item.project?.nextStep}
                      </Text>
                      {item.task?.effortHours != null &&
                        <EffortBadge hours={item.task.effortHours} />}
                    </View>
                  </Pressable>
                </View>
              </View>
            );
          })}
          {todayFocus.total > todayFocus.items.length && (
            <Pressable
              onPress={() => router.push("/tasks")}
              className="flex-row items-center justify-center gap-2 self-start rounded-lg border px-4 py-2"
              style={{
                backgroundColor: `rgba(${ORANGE},0.1)`,
                borderColor: `rgba(${ORANGE},0.3)`,
              }}
            >
              <Text className="text-sm font-medium" style={{ color: ORANGE_T }}>
                {t("views.today.focus.viewAll")}
              </Text>
              <View
                className="rounded-full px-1.5 py-0.5"
                style={{ backgroundColor: `rgba(${ORANGE},0.3)` }}
              >
                <Text className="text-xs" style={{ color: ORANGE_T }}>
                  {t("views.today.focus.moreCount", {
                    count: todayFocus.total - todayFocus.items.length,
                  })}
                </Text>
              </View>
              <ChevronRight size={14} color={ORANGE_T} />
            </Pressable>
          )}
        </View>
      )}
    </CollapsibleSection>
  );
}
