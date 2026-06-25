import { Pressable, Text, View } from "react-native";
import { Repeat } from "lucide-react-native";
import type { Category, Project, Task } from "@/lib/types";
import {
  alpha,
  categoryChipColors,
  type ThemeColors,
} from "@/theme/useThemeColors";
import {
  blockMinutes,
  hoursRange,
  rollupByProject,
  timeToMinutes,
  type DayLoad,
  type RoutineItem,
} from "@/lib/calendar";
import {
  LoadBar,
  ProjectChip,
  RoutineChip,
  TaskChip,
  type CalendarHandlers,
} from "./parts";

const HOUR_PX = 52;
const GUTTER = 48;
const MIN_BLOCK = 28;

export function DayGrid({
  iso,
  todayISO,
  locale,
  dayTasks,
  dayRoutines,
  load,
  projectsById,
  categoryById,
  showTasks,
  showLoad,
  colors,
  handlers,
  allDayLabel,
  nowLabel,
  emptyLabel,
}: {
  iso: string;
  todayISO: string;
  locale: string;
  dayTasks: Task[];
  dayRoutines: RoutineItem[];
  load: DayLoad;
  projectsById: Map<string, Project>;
  categoryById: Record<string, Category>;
  showTasks: boolean;
  showLoad: boolean;
  colors: ThemeColors;
  handlers: CalendarHandlers;
  allDayLabel: string;
  nowLabel: string;
  emptyLabel: string;
}) {
  const timedTasks = dayTasks.filter((t) => t.dueTime);
  const untimedTasks = dayTasks.filter((t) => !t.dueTime);
  const timedRoutines = dayRoutines.filter((r) => r.routine.timeOfDay);
  const untimedRoutines = dayRoutines.filter((r) => !r.routine.timeOfDay);

  const starts = [
    ...timedTasks.map((t) => timeToMinutes(t.dueTime) ?? 0),
    ...timedRoutines.map((r) => timeToMinutes(r.routine.timeOfDay) ?? 0),
  ];
  const [startHour, endHour] = hoursRange(starts);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const gridHeight = (endHour - startHour) * HOUR_PX;
  const topFor = (minutes: number) => (minutes / 60 - startHour) * HOUR_PX;

  const untimedRollups = rollupByProject(untimedTasks, projectsById);
  const untimedEmpty =
    untimedRollups.length === 0 && untimedRoutines.length === 0;

  const isToday = iso === todayISO;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNow =
    isToday && nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60;

  return (
    <View className="gap-3">
      {showLoad && (
        <View className="flex-row items-center gap-2">
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            ≈ {load.hours}h
          </Text>
          <View className="flex-1">
            <LoadBar load={load} colors={colors} />
          </View>
        </View>
      )}

      {/* All-day row */}
      <View
        className="rounded-xl border"
        style={{ borderColor: colors.border, backgroundColor: colors.surface }}
      >
        <View className="flex-row">
          <View
            className="px-2 py-2"
            style={{
              width: GUTTER,
              borderRightWidth: 1,
              borderRightColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 10 }}>
              {allDayLabel}
            </Text>
          </View>
          <View
            className="flex-1 flex-row flex-wrap gap-1 p-1.5"
            style={{ minHeight: 36 }}
          >
            {untimedRollups.map((r, i) =>
              showTasks || !r.project
                ? r.tasks.map((tk) => (
                    <View key={tk.id} style={{ maxWidth: 220 }}>
                      <TaskChip
                        task={tk}
                        colors={colors}
                        onOpenTask={handlers.onOpenTask}
                        onToggleTask={handlers.onToggleTask}
                      />
                    </View>
                  ))
                : (
                    <View key={r.project?.id ?? `none-${i}`} style={{ maxWidth: 220 }}>
                      <ProjectChip
                        rollup={r}
                        categoryById={categoryById}
                        colors={colors}
                        onOpenProject={handlers.onOpenProject}
                      />
                    </View>
                  )
            )}
            {untimedRoutines.map((item) => (
              <View
                key={`${item.routine.id}-${item.scheduledDate}`}
                style={{ maxWidth: 220 }}
              >
                <RoutineChip
                  item={item}
                  colors={colors}
                  onComplete={handlers.onCompleteOccurrence}
                  onUncomplete={handlers.onUncompleteOccurrence}
                />
              </View>
            ))}
            {untimedEmpty && (
              <Text
                className="px-1 py-1 text-xs italic"
                style={{ color: colors.textMuted }}
              >
                {emptyLabel}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Hourly grid */}
      <View
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: colors.border, backgroundColor: colors.surface }}
      >
        <View style={{ height: gridHeight }}>
          {hours.map((h, idx) => (
            <View
              key={h}
              className="flex-row"
              style={{
                height: HOUR_PX,
                borderTopWidth: idx === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              <View
                style={{
                  width: GUTTER,
                  borderRightWidth: 1,
                  borderRightColor: colors.border,
                }}
              >
                <Text
                  className="px-1 pt-0.5"
                  style={{ color: colors.textMuted, fontSize: 10 }}
                >
                  {new Date(2000, 0, 1, h).toLocaleTimeString(locale, {
                    hour: "numeric",
                  })}
                </Text>
              </View>
              <View className="flex-1" />
            </View>
          ))}

          {/* events overlay */}
          <View
            style={{ position: "absolute", left: GUTTER, right: 0, top: 0, height: gridHeight }}
          >
            {timedTasks.map((t) => {
              const start = timeToMinutes(t.dueTime) ?? 0;
              const project = t.projectId
                ? projectsById.get(t.projectId) ?? null
                : null;
              const cat = project?.categoryId
                ? categoryById[project.categoryId]
                : undefined;
              const cc = cat
                ? categoryChipColors(cat.color, colors)
                : {
                    bg: alpha(colors.accent2, 0.16),
                    text: colors.accent2,
                    border: alpha(colors.accent2, 0.4),
                    dot: colors.accent2,
                  };
              const h = Math.max(
                MIN_BLOCK,
                (blockMinutes(t.durationMinutes, t.effortHours) / 60) * HOUR_PX
              );
              return (
                <Pressable
                  key={t.id}
                  onPress={() => handlers.onOpenTask(t.id)}
                  style={{
                    position: "absolute",
                    top: topFor(start),
                    height: h,
                    left: 6,
                    right: 8,
                    backgroundColor: cc.bg,
                    borderColor: cc.border,
                    borderWidth: 1,
                    borderRadius: 6,
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                    overflow: "hidden",
                  }}
                >
                  <Text
                    numberOfLines={1}
                    className="text-xs font-medium"
                    style={{ color: cc.text }}
                  >
                    {t.title}
                  </Text>
                  {project && (
                    <Text
                      numberOfLines={1}
                      style={{ color: cc.text, opacity: 0.7, fontSize: 10 }}
                    >
                      {project.name}
                    </Text>
                  )}
                </Pressable>
              );
            })}
            {timedRoutines.map((item) => {
              const start = timeToMinutes(item.routine.timeOfDay) ?? 0;
              const h = Math.max(
                MIN_BLOCK,
                (blockMinutes(
                  item.routine.durationMinutes,
                  item.routine.effortHours
                ) /
                  60) *
                  HOUR_PX
              );
              return (
                <View
                  key={`${item.routine.id}-${item.scheduledDate}`}
                  style={{
                    position: "absolute",
                    top: topFor(start),
                    height: h,
                    left: 6,
                    right: 8,
                    backgroundColor: alpha(colors.accent, 0.14),
                    borderColor: alpha(colors.accent, 0.3),
                    borderWidth: 1,
                    borderRadius: 6,
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    overflow: "hidden",
                    opacity: item.completed ? 0.55 : 1,
                  }}
                >
                  <Repeat size={11} color={colors.accent} />
                  <Text
                    numberOfLines={1}
                    className="flex-1 text-xs"
                    style={{
                      color: colors.accent,
                      textDecorationLine: item.completed ? "line-through" : "none",
                    }}
                  >
                    {item.routine.title}
                  </Text>
                </View>
              );
            })}

            {showNow && (
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: topFor(nowMinutes),
                  height: 0,
                  borderTopWidth: 2,
                  borderTopColor: colors.accent,
                }}
              >
                <View
                  style={{
                    position: "absolute",
                    left: 0,
                    top: -4,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.accent,
                  }}
                />
                <Text
                  style={{
                    position: "absolute",
                    left: 12,
                    top: -7,
                    fontSize: 10,
                    color: colors.accent,
                    backgroundColor: colors.surface,
                    paddingHorizontal: 3,
                  }}
                >
                  {nowLabel}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
