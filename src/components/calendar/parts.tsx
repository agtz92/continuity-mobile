import { Pressable, Text, View } from "react-native";
import { Check, Repeat } from "lucide-react-native";
import type { Category, Task } from "@/lib/types";
import {
  alpha,
  categoryChipColors,
  type ThemeColors,
} from "@/theme/useThemeColors";
import {
  OVERLOAD_HOURS,
  type DayLoad,
  type ProjectRollup,
  type RoutineItem,
} from "@/lib/calendar";

/** Interactions shared by every calendar sub-view. */
export interface CalendarHandlers {
  onOpenProject: (projectId: string) => void;
  onOpenTask: (taskId: string) => void;
  onToggleTask: (task: Task) => void | Promise<void>;
  // Routines aren't completable from the calendar — tapping one opens its edit
  // detail instead (completion happens from the Routines/Today views).
  onOpenRoutine: (routineId: string) => void;
}

const projectColors = (
  project: ProjectRollup["project"],
  categoryById: Record<string, Category>,
  c: ThemeColors
) => {
  const cat = project?.categoryId ? categoryById[project.categoryId] : undefined;
  if (cat) return categoryChipColors(cat.color, c);
  return {
    bg: alpha(c.accent2, 0.14),
    text: c.accent2,
    border: alpha(c.accent2, 0.32),
    dot: c.accent2,
  };
};

/** One chip per project for a day (default view), with a task count badge. */
export function ProjectChip({
  rollup,
  categoryById,
  colors,
  onOpenProject,
}: {
  rollup: ProjectRollup;
  categoryById: Record<string, Category>;
  colors: ThemeColors;
  onOpenProject: (projectId: string) => void;
}) {
  const { project, tasks } = rollup;
  const cc = projectColors(project, categoryById, colors);
  return (
    <Pressable
      onPress={() => project && onOpenProject(project.id)}
      disabled={!project}
      className="flex-row items-center gap-1.5 rounded-md border px-2 py-1.5"
      style={{ backgroundColor: cc.bg, borderColor: cc.border }}
    >
      <Text
        numberOfLines={1}
        className="flex-1 text-xs font-medium"
        style={{ color: cc.text }}
      >
        {project?.name ?? "—"}
      </Text>
      <View
        className="rounded-full px-1.5"
        style={{ backgroundColor: alpha(cc.text, 0.2) }}
      >
        <Text style={{ color: cc.text, fontSize: 10 }}>{tasks.length}</Text>
      </View>
    </Pressable>
  );
}

/** A single task (Ver tareas on, or tasks with no project). */
export function TaskChip({
  task,
  colors,
  onOpenTask,
  onToggleTask,
}: {
  task: Task;
  colors: ThemeColors;
  onOpenTask: (taskId: string) => void;
  onToggleTask: (task: Task) => void | Promise<void>;
}) {
  return (
    <View
      className="flex-row items-center gap-2 rounded-md border px-2 py-1.5"
      style={{ backgroundColor: colors.surface, borderColor: colors.border }}
    >
      <Pressable onPress={() => onToggleTask(task)} hitSlop={8}>
        <Check size={14} color={colors.textMuted} />
      </Pressable>
      <Pressable className="flex-1" onPress={() => onOpenTask(task.id)}>
        <Text numberOfLines={1} className="text-xs" style={{ color: colors.text }}>
          {task.title}
        </Text>
      </Pressable>
      {task.effortHours != null && (
        <Text style={{ color: colors.textMuted, fontSize: 10 }}>
          {task.effortHours}h
        </Text>
      )}
    </View>
  );
}

/** A routine occurrence chip; tap opens the routine's edit detail. The
 *  completed state is shown read-only (calendar doesn't toggle routines). */
export function RoutineChip({
  item,
  colors,
  onOpen,
}: {
  item: RoutineItem;
  colors: ThemeColors;
  onOpen: (routineId: string) => void;
}) {
  return (
    <Pressable
      onPress={() => onOpen(item.routine.id)}
      className="flex-row items-center gap-2 rounded-md border px-2 py-1.5"
      style={{
        backgroundColor: alpha(colors.accent, 0.12),
        borderColor: alpha(colors.accent, 0.28),
        opacity: item.completed ? 0.55 : 1,
      }}
    >
      {item.completed ? (
        <Check size={14} color={colors.accent} />
      ) : (
        <Repeat size={14} color={colors.accent} />
      )}
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
    </Pressable>
  );
}

/** Thin per-day load bar; width and color scale with estimated hours. */
export function LoadBar({ load, colors }: { load: DayLoad; colors: ThemeColors }) {
  const color =
    load.level === "over"
      ? "#ef4444"
      : load.level === "busy"
        ? "#f59e0b"
        : colors.accent;
  const pct =
    load.hours <= 0
      ? 0
      : Math.max(8, Math.min(100, Math.round((load.hours / OVERLOAD_HOURS) * 100)));
  return (
    <View
      className="h-1 overflow-hidden rounded-full"
      style={{ backgroundColor: colors.border }}
    >
      <View style={{ height: "100%", width: `${pct}%`, backgroundColor: color }} />
    </View>
  );
}
