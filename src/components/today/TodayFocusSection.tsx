import { memo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { CalendarClock, ChevronRight, Target } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import type { Project, Task } from "@/lib/types";
import { daysOverdue, daysSince } from "@/lib/date";
import { alpha, useThemeColors } from "@/theme/useThemeColors";
import { SIZE } from "@/theme/tokens";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Meta } from "@/components/ui/Meta";
import { TaskToggle } from "@/components/tasks/TaskToggle";
import type { useTodayFocus } from "@/hooks/useTodayFocus";
import { EffortBadge } from "./EffortBadge";
import { focusTint } from "./todayColors";

type FocusModel = ReturnType<typeof useTodayFocus>;
type FocusItem = FocusModel["todayFocus"]["items"][number];

/**
 * Una fila de "Enfoque de hoy". Componente aparte de `TaskRow` a propósito:
 * mezcla tareas, proyectos estancados y próximos pasos. Comparte el lenguaje
 * (toggle + espina + badge), no el componente.
 *
 * Breathe: badge "Overdue · 2 days" en su propia línea; en vencidas solo queda
 * **Reschedule** ("Move to today" se quitó).
 */
const FocusRow = memo(function FocusRow({
  item,
  onToggle,
  onOpenProject,
  onReschedule,
}: {
  item: FocusItem;
  onToggle: (task: Task) => void;
  onOpenProject: (id: string) => void;
  onReschedule: (task: Task) => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const tint = focusTint(item.type, c);
  const late =
    item.type === "overdue" && item.task?.dueDate ? daysOverdue(item.task.dueDate) : null;
  const label = t(
    item.type === "today"
      ? "views.today.focus.labels.dueToday"
      : item.type === "overdue"
        ? "views.today.focus.labels.overdue"
        : item.type === "stalled"
          ? "views.today.focus.labels.stalled"
          : "views.today.focus.labels.nextStep",
  );
  const title = item.task
    ? item.task.title
    : item.type === "stalled" && item.project
      ? t("views.today.focus.daysIdleLine", {
          name: item.project.name,
          count: daysSince(item.project.lastActivity) ?? 0,
        })
      : item.project?.nextStep;

  return (
    <View
      className="flex-row items-start rounded-lg bg-surface"
      style={{
        padding: 14,
        gap: 14,
        borderWidth: 1,
        borderColor: tint.border,
        borderLeftWidth: 3,
        borderLeftColor: tint.spine,
      }}
    >
      {item.task ? (
        <TaskToggle
          done={false}
          overdue={item.type === "overdue"}
          onToggle={() => onToggle(item.task!)}
          label={t("views.today.focus.markDone")}
        />
      ) : null}
      <Pressable
        className="min-w-0 flex-1"
        onPress={item.project ? () => onOpenProject(item.project!.id) : undefined}
        disabled={!item.project}
        accessibilityRole={item.project ? "button" : undefined}
      >
        {late !== null ? (
          // Badge en su propia línea: compartirla con el proyecto la cortaba.
          <View
            className="mb-1.5 self-start rounded-md px-2"
            style={{ paddingVertical: 3, backgroundColor: alpha(c.signal, 0.14) }}
          >
            <Meta variant="cintillo" tone="inherit" style={{ color: c.signal, letterSpacing: 0.8 }}>
              {t("taskRow.overdueDays", { count: late })}
            </Meta>
          </View>
        ) : (
          <Text className="mb-1 font-sans" style={{ fontSize: 13, color: c.text3 }}>
            <Text className="font-sans-semibold uppercase" style={{ color: tint.tint, letterSpacing: 0.6 }}>
              {label}
            </Text>
            {item.project && item.task ? ` · ${item.project.name}` : ""}
          </Text>
        )}
        <Text className="font-sans" style={{ fontSize: 17, lineHeight: 23, color: c.text }}>
          {title}
        </Text>
        <View className="mt-1 flex-row flex-wrap items-center gap-2">
          {late !== null && item.project ? (
            <Text className="font-sans" style={{ fontSize: 14, color: c.text3 }}>
              {item.project.name}
            </Text>
          ) : null}
          {item.task?.effortHours != null ? <EffortBadge hours={item.task.effortHours} /> : null}
        </View>
        {item.type === "overdue" && item.task ? (
          <Pressable
            onPress={() => onReschedule(item.task!)}
            accessibilityRole="button"
            className="mt-2.5 flex-row items-center gap-1.5 self-start rounded-md px-3 active:opacity-70"
            style={{ height: 36, borderWidth: 1, borderColor: c.line[18] }}
          >
            <CalendarClock size={15} color={c.text3} />
            <Text className="font-sans-medium" style={{ fontSize: 14, color: c.text2 }}>
              {t("taskRow.reschedule")}
            </Text>
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  );
});

/** "Enfoque de hoy": lista priorizada de qué atender (overdue / hoy / estancado / próximo paso). */
export function TodayFocusSection({
  todayFocus,
  todayTaskCounts,
  todayEffortHours,
  projects,
  toggleTask,
  jumpToProject,
}: {
  todayFocus: FocusModel["todayFocus"];
  todayTaskCounts: FocusModel["todayTaskCounts"];
  todayEffortHours: number;
  projects: Project[];
  toggleTask: (t: Task) => void | Promise<void>;
  jumpToProject: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const { t } = useTranslation();
  const c = useThemeColors();
  const router = useRouter();

  const reschedule = (task: Task) =>
    router.push({ pathname: "/task-form", params: { id: task.id } });

  const meta =
    todayTaskCounts.total > 0 ? (
      <>
        {t("views.today.focus.tasksLabel", { count: todayTaskCounts.total })}
        {todayTaskCounts.overdue > 0 ? (
          <Text style={{ color: c.signal }}>
            {" "}
            {t("views.today.focus.overdueExtra", { count: todayTaskCounts.overdue })}
          </Text>
        ) : null}
        {todayEffortHours > 0
          ? ` · ${t("views.today.focus.totalHoursLabel", { hours: todayEffortHours })}`
          : ""}
      </>
    ) : null;

  return (
    <CollapsibleSection
      open={open}
      onToggle={() => setOpen((s) => !s)}
      icon={<Target size={18} color={c.accent} />}
      title={t("views.today.focus.title")}
      meta={meta}
    >
      {todayFocus.items.length === 0 ? (
        <View
          className="items-center rounded-lg bg-surface"
          style={{ padding: 28, borderWidth: 1, borderColor: c.line[14] }}
        >
          <Text className="mb-2 font-sans-medium" style={{ fontSize: 16, color: c.text2 }}>
            {t("views.today.focus.emptyTitle")}
          </Text>
          <Text className="text-center font-sans" style={{ fontSize: 15, color: c.text3 }}>
            {projects.length === 0
              ? t("views.today.focus.emptyHintFirst")
              : t("views.today.focus.emptyHintNext")}
          </Text>
        </View>
      ) : (
        <View className="gap-3">
          {todayFocus.items.map((item, idx) => (
            <FocusRow
              key={item.task?.id ?? `${item.type}-${item.project?.id ?? idx}`}
              item={item}
              onToggle={toggleTask}
              onOpenProject={jumpToProject}
              onReschedule={reschedule}
            />
          ))}
          {todayFocus.total > todayFocus.items.length ? (
            <Pressable
              onPress={() => router.push("/tasks")}
              accessibilityRole="button"
              className="flex-row items-center gap-2 self-start active:opacity-70"
              style={{ height: SIZE.hit }}
            >
              <Text className="font-sans-medium" style={{ fontSize: 15, color: c.accent }}>
                {t("views.today.focus.viewAll")} ·{" "}
                {t("views.today.focus.moreCount", {
                  count: todayFocus.total - todayFocus.items.length,
                })}
              </Text>
              <ChevronRight size={16} color={c.accent} />
            </Pressable>
          ) : null}
        </View>
      )}
    </CollapsibleSection>
  );
}
