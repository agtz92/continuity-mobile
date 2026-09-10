import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeOut, LinearTransition } from "react-native-reanimated";
import {
  Archive,
  ArchiveRestore,
  Clock,
  Pencil,
  Repeat,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { Routine } from "@/lib/types";
import { describeRecurrence } from "@/lib/recurrence";
import { daysOverdue, todayLocalISODate } from "@/lib/date";
import { confirmCompleted } from "@/lib/feedback";
import { alpha, categoryChipColors, useThemeColors } from "@/theme/useThemeColors";
import { Meta } from "@/components/ui/Meta";
import { EffortBadge } from "@/components/today/EffortBadge";
import { TaskToggle } from "@/components/tasks/TaskToggle";


/**
 * Row for a single routine occurrence. `scheduledDate` is the day this row
 * represents; `occurrenceId` is non-null iff already completed that day.
 *
 * Completing gives instant confirmation (success haptic + toast) and an
 * optimistic checked state, then the row fades out when the refetch drops it.
 */
export function RoutineRow({
  routine,
  scheduledDate,
  occurrenceId,
  project,
  onComplete,
  onUncomplete,
  onEdit,
  onArchive,
  onDelete,
}: {
  routine: Routine;
  scheduledDate: string;
  occurrenceId: string | null;
  project?: { name: string; color: string } | null;
  onComplete: (routineId: string, scheduledDate: string) => void | Promise<void>;
  onUncomplete: (occurrenceId: string) => void | Promise<void>;
  onEdit?: (r: Routine) => void;
  onArchive?: (r: Routine) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const c = useThemeColors();
  const recLabel = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      t(`recurrence.${key}`, vars),
    [t]
  );
  const [optimisticDone, setOptimisticDone] = useState(false);
  const isDone = occurrenceId !== null || optimisticDone;
  const today = todayLocalISODate();
  const overdue = !isDone && scheduledDate < today;
  const dueToday = !isDone && scheduledDate === today;

  const handleToggle = () => {
    if (isDone) {
      // Un-complete only once the server occurrence exists; ignore taps while
      // an optimistic completion is still in flight.
      if (occurrenceId) {
        setOptimisticDone(false);
        onUncomplete(occurrenceId);
      }
    } else {
      setOptimisticDone(true);
      confirmCompleted(t("routineRow.completedToast"));
      onComplete(routine.id, scheduledDate);
    }
  };

  const lateDays = overdue ? daysOverdue(scheduledDate) : null;

  const borderColor = overdue
    ? alpha(c.signal, 0.3)
    : dueToday
    ? alpha(c.accent, 0.3)
    : c.border;
  const spineColor = overdue
    ? c.signal
    : dueToday
    ? c.accent
    : c.border;

  const projectDot = project ? categoryChipColors(project.color, c).dot : null;

  return (
    <Animated.View
      exiting={FadeOut.duration(220)}
      layout={LinearTransition.duration(220)}
    >
      <View
        className="flex-row items-center gap-3 rounded-lg border bg-surface p-3"
        style={{ borderColor, borderLeftWidth: 3, borderLeftColor: spineColor }}
      >
        <TaskToggle
          done={isDone}
          overdue={overdue}
          kind="routine"
          onToggle={handleToggle}
          label={
            isDone ? t("routineRow.markNotDone") : t("routineRow.markDone")
          }
        />

        <Pressable
          className="min-w-0 flex-1"
          onPress={onEdit ? () => onEdit(routine) : undefined}
          disabled={!onEdit}
        >
          <View className="flex-row flex-wrap items-center gap-2">
            <Text
              className={"font-sans " + 
                "text-base " +
                (isDone ? "text-text-muted line-through" : "text-text")
              }
            >
              {routine.title}
            </Text>
            {/* La recurrencia y las horas son metadato, no señal: mismo
                tratamiento que en `TaskRow`. El ↻ ya lo dice el toggle. */}
            <View className="flex-row items-center gap-1">
              <Repeat size={10} color={c.text5} />
              <Meta tone="faint">{describeRecurrence(routine, recLabel)}</Meta>
            </View>
            {routine.effortHours != null && (
              <EffortBadge hours={routine.effortHours} />
            )}
          </View>
          <View className="mt-0.5 flex-row flex-wrap items-center gap-x-2 gap-y-1">
            {overdue && lateDays !== null ? (
              <View
                className="rounded-md px-1.5 py-0.5"
                style={{
                  backgroundColor: alpha(c.signal, 0.2),
                  borderWidth: 1,
                  borderColor: alpha(c.signal, 0.4),
                }}
              >
                <Text
                  className="text-[10px] font-sans-semibold uppercase tracking-wide"
                  style={{ color: c.signal }}
                >
                  {t("routineRow.overdueDays", { count: lateDays })}
                </Text>
              </View>
            ) : dueToday ? (
              <View
                className="rounded-md px-1.5 py-0.5"
                style={{
                  backgroundColor: alpha(c.accent, 0.2),
                  borderWidth: 1,
                  borderColor: alpha(c.accent, 0.4),
                }}
              >
                <Text
                  className="text-[10px] font-sans-semibold uppercase tracking-wide"
                  style={{ color: c.accent }}
                >
                  {t("routineRow.todayBadge")}
                </Text>
              </View>
            ) : (
              <Text className="font-sans text-xs" style={{ color: c.textMuted }}>
                {new Date(scheduledDate + "T00:00:00").toLocaleDateString(
                  i18n.language
                )}
              </Text>
            )}
            {project && (
              <View className="flex-row items-center gap-1">
                <View
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: projectDot ?? c.textMuted }}
                />
                <Text className="font-sans text-xs text-text-muted">{project.name}</Text>
              </View>
            )}
            {!!routine.description && (
              <Text className="font-sans text-xs text-text-muted">
                · {routine.description}
              </Text>
            )}
          </View>
        </Pressable>

        {onEdit && (
          <Pressable
            onPress={() => onEdit(routine)}
            accessibilityRole="button"
            accessibilityLabel={t("routineRow.editAria")}
            hitSlop={8}
          >
            <Pencil size={14} color={c.textMuted} />
          </Pressable>
        )}
        {onArchive && (
          <Pressable
            onPress={() => onArchive(routine)}
            accessibilityRole="button"
            accessibilityLabel={
              routine.archived
                ? t("routineRow.unarchiveAria")
                : t("routineRow.archiveAria")
            }
            hitSlop={8}
          >
            {routine.archived ? (
              <ArchiveRestore size={14} color={c.textMuted} />
            ) : (
              <Archive size={14} color={c.textMuted} />
            )}
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}
