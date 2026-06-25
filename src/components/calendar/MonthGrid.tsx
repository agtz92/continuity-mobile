import { Pressable, Text, View } from "react-native";
import type { Task } from "@/lib/types";
import type { ThemeColors } from "@/theme/useThemeColors";
import { dayLoad, isSameMonth, type RoutineItem } from "@/lib/calendar";

export function MonthGrid({
  weeks,
  refDate,
  todayISO,
  weekdayLabels,
  tasksByDay,
  routinesByDay,
  showLoad,
  colors,
  onPickDay,
}: {
  weeks: string[][];
  refDate: Date;
  todayISO: string;
  weekdayLabels: string[];
  tasksByDay: Map<string, Task[]>;
  routinesByDay: Map<string, RoutineItem[]>;
  showLoad: boolean;
  colors: ThemeColors;
  onPickDay: (iso: string) => void;
}) {
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
            const count = dayTasks.length + dayRoutines.length;
            const load = dayLoad(dayTasks, dayRoutines);
            const inMonth = isSameMonth(iso, refDate);
            const isToday = iso === todayISO;
            const d = new Date(iso + "T00:00:00");
            const dotColor =
              load.level === "over"
                ? "#ef4444"
                : load.level === "busy"
                  ? "#f59e0b"
                  : colors.accent;
            return (
              <Pressable
                key={iso}
                onPress={() => onPickDay(iso)}
                className="flex-1 items-center rounded-lg border py-1.5"
                style={{
                  borderColor: isToday ? colors.accent : colors.border,
                  backgroundColor: colors.surface,
                  opacity: inMonth ? 1 : 0.4,
                  minHeight: 54,
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
                    style={{ color: isToday ? colors.bg : colors.text }}
                  >
                    {d.getDate()}
                  </Text>
                </View>
                {count > 0 ? (
                  <View className="mt-1 items-center gap-0.5">
                    {showLoad && (
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: dotColor,
                        }}
                      />
                    )}
                    <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                      {count}
                    </Text>
                  </View>
                ) : (
                  <View className="mt-1" style={{ height: 6 }} />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
