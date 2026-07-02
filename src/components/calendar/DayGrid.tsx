import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronDown, ChevronUp, Repeat } from "lucide-react-native";
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
// Above this many all-day items, collapse the tail behind a "Show more" toggle
// so a day full of untimed work doesn't push the timed grid off-screen.
const ALL_DAY_COLLAPSED = 4;

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
  withTimeLabel,
  moreLabel,
  lessLabel,
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
  withTimeLabel: string;
  moreLabel: (count: number) => string;
  lessLabel: string;
  nowLabel: string;
  emptyLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);

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

  // Flatten every untimed entry (project rollup, standalone task, or routine)
  // into a single readable list — a full-width row per item instead of the old
  // wrap-of-tiny-chips where only a color and a count were legible.
  const allDayItems: { key: string; node: ReactNode }[] = [];
  untimedRollups.forEach((r, i) => {
    if (showTasks || !r.project) {
      r.tasks.forEach((tk) => {
        allDayItems.push({
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
      allDayItems.push({
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
    allDayItems.push({
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

  const hasOverflow = allDayItems.length > ALL_DAY_COLLAPSED;
  const visibleItems =
    hasOverflow && !expanded
      ? allDayItems.slice(0, ALL_DAY_COLLAPSED)
      : allDayItems;
  const hiddenCount = allDayItems.length - visibleItems.length;

  const timedCount = timedTasks.length + timedRoutines.length;

  const isToday = iso === todayISO;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNow =
    isToday && nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60;

  const sectionHeader = (label: string, count: number) => (
    <Text
      className="px-0.5 text-xs font-medium"
      style={{ color: colors.textMuted }}
    >
      {label} · {count}
    </Text>
  );

  return (
    <View className="gap-4">
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

      {/* All-day section — a readable vertical list, not a chip strip */}
      {allDayItems.length > 0 && (
        <View className="gap-1.5">
          {sectionHeader(allDayLabel, allDayItems.length)}
          <View className="gap-1.5">
            {visibleItems.map((it) => (
              <View key={it.key}>{it.node}</View>
            ))}
          </View>
          {hasOverflow && (
            <Pressable
              onPress={() => setExpanded((v) => !v)}
              className="flex-row items-center gap-1 self-start px-1 py-1"
              hitSlop={6}
            >
              {expanded ? (
                <ChevronUp size={14} color={colors.accent} />
              ) : (
                <ChevronDown size={14} color={colors.accent} />
              )}
              <Text className="text-xs" style={{ color: colors.accent }}>
                {expanded ? lessLabel : moreLabel(hiddenCount)}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Timed section — the hourly grid only exists when something has a time */}
      {timedCount > 0 && (
        <View className="gap-1.5">
          {sectionHeader(withTimeLabel, timedCount)}
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
      )}

      {allDayItems.length === 0 && timedCount === 0 && (
        <Text
          className="px-1 py-2 text-xs italic"
          style={{ color: colors.textMuted }}
        >
          {emptyLabel}
        </Text>
      )}
    </View>
  );
}
