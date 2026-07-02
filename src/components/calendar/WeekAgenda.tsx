import { Text, View } from "react-native";
import type { Category, Project, Task } from "@/lib/types";
import type { ThemeColors } from "@/theme/useThemeColors";
import { dayLoad, rollupByProject, type RoutineItem } from "@/lib/calendar";
import {
  LoadBar,
  ProjectChip,
  RoutineChip,
  TaskChip,
  type CalendarHandlers,
} from "./parts";

export function WeekAgenda({
  days,
  todayISO,
  locale,
  tasksByDay,
  routinesByDay,
  projectsById,
  categoryById,
  showTasks,
  showLoad,
  colors,
  handlers,
  emptyLabel,
}: {
  days: string[];
  todayISO: string;
  locale: string;
  tasksByDay: Map<string, Task[]>;
  routinesByDay: Map<string, RoutineItem[]>;
  projectsById: Map<string, Project>;
  categoryById: Record<string, Category>;
  showTasks: boolean;
  showLoad: boolean;
  colors: ThemeColors;
  handlers: CalendarHandlers;
  emptyLabel: string;
}) {
  return (
    <View className="gap-2">
      {days.map((iso) => {
        const dayTasks = tasksByDay.get(iso) ?? [];
        const dayRoutines = routinesByDay.get(iso) ?? [];
        const rollups = rollupByProject(dayTasks, projectsById);
        const load = dayLoad(dayTasks, dayRoutines);
        const isToday = iso === todayISO;
        const d = new Date(iso + "T00:00:00");
        const empty = dayTasks.length === 0 && dayRoutines.length === 0;
        return (
          <View
            key={iso}
            className="flex-row gap-3 rounded-xl border p-3"
            style={{
              borderColor: isToday ? colors.accent : colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <View className="w-11 items-center">
              <Text
                className="text-[11px] uppercase"
                style={{ color: colors.textMuted }}
              >
                {d.toLocaleDateString(locale, { weekday: "short" })}
              </Text>
              <View
                className="items-center justify-center"
                style={
                  isToday
                    ? {
                        backgroundColor: colors.accent,
                        borderRadius: 999,
                        width: 26,
                        height: 26,
                      }
                    : undefined
                }
              >
                <Text
                  className="text-base font-semibold"
                  style={{ color: isToday ? colors.bg : colors.text }}
                >
                  {d.getDate()}
                </Text>
              </View>
            </View>
            <View className="flex-1 gap-1.5">
              {showLoad && !empty && <LoadBar load={load} colors={colors} />}
              {empty ? (
                <Text className="text-xs italic" style={{ color: colors.textMuted }}>
                  {emptyLabel}
                </Text>
              ) : (
                <>
                  {rollups.map((r, i) =>
                    showTasks || !r.project
                      ? r.tasks.map((tk) => (
                          <TaskChip
                            key={tk.id}
                            task={tk}
                            colors={colors}
                            onOpenTask={handlers.onOpenTask}
                            onToggleTask={handlers.onToggleTask}
                          />
                        ))
                      : (
                          <ProjectChip
                            key={r.project?.id ?? `none-${i}`}
                            rollup={r}
                            categoryById={categoryById}
                            colors={colors}
                            onOpenProject={handlers.onOpenProject}
                          />
                        )
                  )}
                  {dayRoutines.map((item) => (
                    <RoutineChip
                      key={`${item.routine.id}-${item.scheduledDate}`}
                      item={item}
                      colors={colors}
                      onOpen={handlers.onOpenRoutine}
                    />
                  ))}
                </>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
