import { type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { ArrowRight } from "lucide-react-native";
import type { Category, Project, Task } from "@/lib/types";
import type { ThemeColors } from "@/theme/useThemeColors";
import {
  dayLoad,
  formatTime,
  rollupByProject,
  timeToMinutes,
  type RoutineItem,
} from "@/lib/calendar";
import {
  ProjectChip,
  RoutineChip,
  TaskChip,
  type CalendarHandlers,
} from "./parts";

/**
 * Agenda panel for the day selected in the Month grid: readable rows for the
 * day's items (all-day first, then timed ones sorted by hour) plus an
 * "Open day" shortcut into the full Day view. Fills the dead space under the
 * month matrix instead of forcing a jump out of the month context.
 */
export function SelectedDayAgenda({
  iso,
  locale,
  dayTasks,
  dayRoutines,
  projectsById,
  categoryById,
  showTasks,
  colors,
  handlers,
  openDayLabel,
  activitiesLabel,
  emptyLabel,
  onOpenDay,
}: {
  iso: string;
  locale: string;
  dayTasks: Task[];
  dayRoutines: RoutineItem[];
  projectsById: Map<string, Project>;
  categoryById: Record<string, Category>;
  showTasks: boolean;
  colors: ThemeColors;
  handlers: CalendarHandlers;
  openDayLabel: string;
  activitiesLabel: (count: number) => string;
  emptyLabel: string;
  onOpenDay: (iso: string) => void;
}) {
  const untimedTasks = dayTasks.filter((t) => !t.dueTime);
  const timed: { key: string; minutes: number; time: string; node: ReactNode }[] =
    [];

  dayTasks
    .filter((t) => t.dueTime)
    .forEach((t) => {
      timed.push({
        key: t.id,
        minutes: timeToMinutes(t.dueTime) ?? 0,
        time: formatTime(t.dueTime, locale) ?? "",
        node: (
          <TaskChip
            task={t}
            colors={colors}
            onOpenTask={handlers.onOpenTask}
            onToggleTask={handlers.onToggleTask}
          />
        ),
      });
    });
  dayRoutines
    .filter((r) => r.routine.timeOfDay)
    .forEach((item) => {
      timed.push({
        key: `${item.routine.id}-${item.scheduledDate}`,
        minutes: timeToMinutes(item.routine.timeOfDay) ?? 0,
        time: formatTime(item.routine.timeOfDay, locale) ?? "",
        node: (
          <RoutineChip
            item={item}
            colors={colors}
            onComplete={handlers.onCompleteOccurrence}
            onUncomplete={handlers.onUncompleteOccurrence}
          />
        ),
      });
    });
  timed.sort((a, b) => a.minutes - b.minutes);

  const untimedRoutines = dayRoutines.filter((r) => !r.routine.timeOfDay);
  const untimedRollups = rollupByProject(untimedTasks, projectsById);

  const allDay: { key: string; node: ReactNode }[] = [];
  untimedRollups.forEach((r, i) => {
    if (showTasks || !r.project) {
      r.tasks.forEach((tk) => {
        allDay.push({
          key: tk.id,
          node: (
            <TaskChip
              task={tk}
              colors={colors}
              onOpenTask={handlers.onOpenTask}
              onToggleTask={handlers.onToggleTask}
            />
          ),
        });
      });
    } else {
      allDay.push({
        key: r.project?.id ?? `none-${i}`,
        node: (
          <ProjectChip
            rollup={r}
            categoryById={categoryById}
            colors={colors}
            onOpenProject={handlers.onOpenProject}
          />
        ),
      });
    }
  });
  untimedRoutines.forEach((item) => {
    allDay.push({
      key: `${item.routine.id}-${item.scheduledDate}`,
      node: (
        <RoutineChip
          item={item}
          colors={colors}
          onComplete={handlers.onCompleteOccurrence}
          onUncomplete={handlers.onUncompleteOccurrence}
        />
      ),
    });
  });

  const count = allDay.length + timed.length;
  const load = dayLoad(dayTasks, dayRoutines);
  const d = new Date(iso + "T00:00:00");
  const dateLabel = d.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
  });

  return (
    <View
      className="mt-3 rounded-xl border"
      style={{ borderColor: colors.border, backgroundColor: colors.surface }}
    >
      <View className="flex-row items-center justify-between px-3 pb-1.5 pt-2.5">
        <Text
          numberOfLines={1}
          className="flex-1 text-xs font-medium capitalize"
          style={{ color: colors.text }}
        >
          {dateLabel} · {activitiesLabel(count)}
          {load.hours > 0 ? ` · ≈ ${load.hours}h` : ""}
        </Text>
        <Pressable
          onPress={() => onOpenDay(iso)}
          hitSlop={8}
          className="flex-row items-center gap-1 pl-2"
        >
          <Text className="text-xs" style={{ color: colors.accent }}>
            {openDayLabel}
          </Text>
          <ArrowRight size={13} color={colors.accent} />
        </Pressable>
      </View>

      {count === 0 ? (
        <Text
          className="px-3 pb-3 pt-1 text-xs italic"
          style={{ color: colors.textMuted }}
        >
          {emptyLabel}
        </Text>
      ) : (
        <View className="gap-1.5 px-2.5 pb-2.5 pt-1">
          {allDay.map((it) => (
            <View key={it.key}>{it.node}</View>
          ))}
          {timed.map((it) => (
            <View key={it.key} className="flex-row items-center gap-2">
              <Text
                className="text-[10px] tabular-nums"
                style={{ color: colors.textMuted, width: 44 }}
              >
                {it.time}
              </Text>
              <View className="flex-1">{it.node}</View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
