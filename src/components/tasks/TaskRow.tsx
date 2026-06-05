import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeOut, LinearTransition } from "react-native-reanimated";
import { CalendarPlus, CheckCircle2, Clock, Lock, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { Project, Task } from "@/lib/types";
import { isDueToday, isOverdue } from "@/lib/date";
import { confirmCompleted } from "@/lib/feedback";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

const RED = "239,68,68"; // red-500
const ORANGE = "249,115,22"; // orange-500
const RED_400 = "rgb(248,113,113)";
const ORANGE_400 = "rgb(251,146,60)";
const AMBER_400 = "rgb(251,191,36)";
const GRAY = "107,114,128"; // gray-500

/**
 * Bordered task row: checkbox + title + project/due meta + delete. When
 * `onSchedule` is set and the task has no due date, an inline "Add date" action
 * appears. Border tints red (overdue) / orange (due today).
 *
 * Marking done gives instant confirmation (success haptic + toast) and an
 * optimistic checked state, then the row fades out (Animated exiting) when the
 * refetch drops it from the list — instead of freezing then vanishing.
 */
export function TaskRow({
  task,
  project,
  onToggle,
  onDelete,
  onSchedule,
  onEdit,
}: {
  task: Task;
  project: Project | undefined;
  onToggle: (t: Task) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onSchedule?: (t: Task) => void;
  onEdit?: (t: Task) => void;
}) {
  const { t, i18n } = useTranslation();
  const c = useThemeColors();
  const [optimisticDone, setOptimisticDone] = useState(false);
  const done = task.done || optimisticDone;
  const overdue = !done && isOverdue(task.dueDate);
  const dueToday = !done && isDueToday(task.dueDate);
  const isBlocked = !done && task.blockers.length > 0;

  const borderColor = overdue
    ? `rgba(${RED},0.3)`
    : dueToday
    ? `rgba(${ORANGE},0.3)`
    : c.border;

  const handleToggle = () => {
    if (!done) {
      setOptimisticDone(true);
      confirmCompleted(t("taskRow.completedToast"));
    } else {
      setOptimisticDone(false);
    }
    onToggle(task);
  };

  return (
    <Animated.View
      exiting={FadeOut.duration(220)}
      layout={LinearTransition.duration(220)}
    >
      <View
        className="flex-row items-center gap-3 rounded-lg border bg-surface p-3"
        style={{ borderColor, opacity: isBlocked ? 0.6 : 1 }}
      >
        <Pressable
          onPress={handleToggle}
          accessibilityRole="button"
          accessibilityLabel={
            done ? t("taskRow.markNotDone") : t("taskRow.markDone")
          }
          hitSlop={8}
        >
          <CheckCircle2 size={18} color={done ? c.accent : c.textMuted} />
        </Pressable>

        <Pressable
          className="min-w-0 flex-1"
          onPress={onEdit ? () => onEdit(task) : undefined}
          disabled={!onEdit}
        >
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className={done ? "text-text-muted line-through" : "text-text"}>
              {task.title}
            </Text>
            {task.effortHours != null && (
              <View
                className="flex-row items-center gap-1 rounded border px-2 py-0.5"
                style={{
                  backgroundColor: alpha(c.accent2, 0.15),
                  borderColor: alpha(c.accent2, 0.3),
                }}
              >
                <Clock size={10} color={c.accent2} />
                <Text className="text-xs text-accent-2">{task.effortHours}h</Text>
              </View>
            )}
            {isBlocked && (
              <View
                className="flex-row items-center gap-1 rounded border px-2 py-0.5"
                style={{
                  backgroundColor: `rgba(${GRAY},0.1)`,
                  borderColor: `rgba(${GRAY},0.3)`,
                }}
              >
                <Lock size={10} color={`rgb(${GRAY})`} />
                <Text className="text-xs" style={{ color: `rgb(${GRAY})` }}>
                  {t("taskRow.blocked")}
                </Text>
              </View>
            )}
          </View>
          <View className="mt-0.5 flex-row flex-wrap items-center gap-x-2">
            {project && (
              <Text className="text-xs text-text-muted">{project.name}</Text>
            )}
            {task.dueDate ? (
              <Text
                className="text-xs"
                style={{
                  color: overdue ? RED_400 : dueToday ? ORANGE_400 : c.textMuted,
                }}
              >
                ·{" "}
                {dueToday
                  ? t("taskRow.dueToday")
                  : new Date(task.dueDate).toLocaleDateString(i18n.language)}
              </Text>
            ) : onSchedule ? (
              <Pressable
                className="flex-row items-center gap-1"
                onPress={() => onSchedule(task)}
                hitSlop={6}
              >
                <CalendarPlus size={12} color={AMBER_400} />
                <Text className="text-xs" style={{ color: AMBER_400 }}>
                  {t("taskRow.addDate")}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </Pressable>

        <Pressable
          onPress={() => onDelete(task.id)}
          accessibilityRole="button"
          accessibilityLabel={t("taskRow.deleteAria")}
          hitSlop={8}
        >
          <X size={16} color={c.textMuted} />
        </Pressable>
      </View>
    </Animated.View>
  );
}
