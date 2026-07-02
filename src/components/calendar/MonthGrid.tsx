import { Pressable, Text, View } from "react-native";
import type { Category, Project, Task } from "@/lib/types";
import {
  alpha,
  categoryChipColors,
  type ThemeColors,
} from "@/theme/useThemeColors";
import {
  dayLoad,
  isSameMonth,
  rollupByProject,
  type RoutineItem,
} from "@/lib/calendar";

// How many category micro-bars fit in a cell before collapsing to "+N".
const MAX_BARS = 2;

export function MonthGrid({
  weeks,
  refDate,
  todayISO,
  selectedISO,
  weekdayLabels,
  tasksByDay,
  routinesByDay,
  projectsById,
  categoryById,
  showTasks,
  showLoad,
  colors,
  onPickDay,
}: {
  weeks: string[][];
  refDate: Date;
  todayISO: string;
  selectedISO: string;
  weekdayLabels: string[];
  tasksByDay: Map<string, Task[]>;
  routinesByDay: Map<string, RoutineItem[]>;
  projectsById: Map<string, Project>;
  categoryById: Record<string, Category>;
  showTasks: boolean;
  showLoad: boolean;
  colors: ThemeColors;
  onPickDay: (iso: string) => void;
}) {
  // One micro-bar per entry (project rollup / standalone task / routine),
  // colored by its category, so a glance tells apart the *kind* of work.
  const barColorsFor = (dayTasks: Task[], dayRoutines: RoutineItem[]) => {
    const bars: string[] = [];
    const rollups = rollupByProject(dayTasks, projectsById);
    rollups.forEach((r) => {
      const cat = r.project?.categoryId
        ? categoryById[r.project.categoryId]
        : undefined;
      const color = cat
        ? categoryChipColors(cat.color, colors).dot
        : colors.accent2;
      if (showTasks || !r.project) r.tasks.forEach(() => bars.push(color));
      else bars.push(color);
    });
    dayRoutines.forEach(() => bars.push(colors.accent));
    return bars;
  };

  return (
    <View className="gap-1">
      <View className="flex-row">
        {weekdayLabels.map((w, i) => (
          <Text
            key={i}
            className="flex-1 text-center text-[10px] uppercase"
            style={{ color: colors.textMuted }}
          >
            {w}
          </Text>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0]} className="flex-row gap-1">
          {week.map((iso) => {
            const dayTasks = tasksByDay.get(iso) ?? [];
            const dayRoutines = routinesByDay.get(iso) ?? [];
            const bars = barColorsFor(dayTasks, dayRoutines);
            const visibleBars = bars.slice(0, MAX_BARS);
            const hidden = bars.length - visibleBars.length;
            const load = dayLoad(dayTasks, dayRoutines);
            const inMonth = isSameMonth(iso, refDate);
            const isToday = iso === todayISO;
            const isSelected = iso === selectedISO;
            const d = new Date(iso + "T00:00:00");
            // Load moved off the dot and onto the day number tint so the
            // bars below can carry category colors instead.
            const numberColor =
              showLoad && load.level === "over"
                ? "#ef4444"
                : showLoad && load.level === "busy"
                  ? "#f59e0b"
                  : colors.text;
            return (
              <Pressable
                key={iso}
                onPress={() => onPickDay(iso)}
                className="flex-1 items-center rounded-lg border px-0.5 py-1.5"
                style={{
                  borderColor: isSelected
                    ? colors.accent
                    : isToday
                      ? alpha(colors.accent, 0.55)
                      : colors.border,
                  borderWidth: isSelected ? 1.5 : 1,
                  backgroundColor: isSelected
                    ? alpha(colors.accent, 0.1)
                    : colors.surface,
                  opacity: inMonth ? 1 : 0.4,
                  minHeight: 58,
                }}
              >
                <View
                  className="items-center justify-center"
                  style={
                    isToday
                      ? {
                          backgroundColor: colors.accent,
                          borderRadius: 999,
                          width: 22,
                          height: 22,
                        }
                      : undefined
                  }
                >
                  <Text
                    className="text-xs font-medium"
                    style={{ color: isToday ? colors.bg : numberColor }}
                  >
                    {d.getDate()}
                  </Text>
                </View>
                <View className="mt-1 w-full gap-0.5 px-0.5">
                  {visibleBars.map((color, i) => (
                    <View
                      key={i}
                      style={{
                        height: 3,
                        borderRadius: 2,
                        backgroundColor: color,
                      }}
                    />
                  ))}
                  {hidden > 0 && (
                    <Text
                      className="text-center"
                      style={{ color: colors.textMuted, fontSize: 8 }}
                    >
                      +{hidden}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
