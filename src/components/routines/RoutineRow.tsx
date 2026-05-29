import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  Clock,
  Pencil,
  Repeat,
  X,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { Routine } from "@/lib/types";
import { describeRecurrence } from "@/lib/recurrence";
import { todayLocalISODate } from "@/lib/date";
import { alpha, categoryChipColors, useThemeColors } from "@/theme/useThemeColors";

const RED = "239,68,68"; // red-500
const ORANGE = "249,115,22"; // orange-500
const RED_400 = "rgb(248,113,113)";
const ORANGE_400 = "rgb(251,146,60)";

/**
 * Row for a single routine occurrence. `scheduledDate` is the day this row
 * represents; `occurrenceId` is non-null iff already completed that day.
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
  const done = occurrenceId !== null;
  const today = todayLocalISODate();
  const overdue = !done && scheduledDate < today;
  const dueToday = !done && scheduledDate === today;

  const handleToggle = () => {
    if (done && occurrenceId) {
      onUncomplete(occurrenceId);
    } else {
      onComplete(routine.id, scheduledDate);
    }
  };

  const borderColor = overdue
    ? `rgba(${RED},0.3)`
    : dueToday
    ? `rgba(${ORANGE},0.3)`
    : c.border;

  const projectDot = project ? categoryChipColors(project.color, c).dot : null;

  const badgeStyle = {
    backgroundColor: alpha(c.accent2, 0.15),
    borderColor: alpha(c.accent2, 0.3),
  };

  return (
    <View
      className="flex-row items-center gap-3 rounded-lg border bg-surface p-3"
      style={{ borderColor }}
    >
      <Pressable
        onPress={handleToggle}
        accessibilityRole="button"
        accessibilityLabel={done ? t("routineRow.markNotDone") : t("routineRow.markDone")}
        hitSlop={8}
      >
        <CheckCircle2 size={18} color={done ? c.accent : c.textMuted} />
      </Pressable>

      <Pressable
        className="min-w-0 flex-1"
        onPress={onEdit ? () => onEdit(routine) : undefined}
        disabled={!onEdit}
      >
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className={done ? "text-text-muted line-through" : "text-text"}>
            {routine.title}
          </Text>
          <View
            className="flex-row items-center gap-1 rounded border px-2 py-0.5"
            style={badgeStyle}
          >
            <Repeat size={10} color={c.accent2} />
            <Text className="text-xs text-accent-2">
              {describeRecurrence(routine, recLabel)}
            </Text>
          </View>
          {routine.effortHours != null && (
            <View
              className="flex-row items-center gap-1 rounded border px-2 py-0.5"
              style={badgeStyle}
            >
              <Clock size={10} color={c.accent2} />
              <Text className="text-xs text-accent-2">{routine.effortHours}h</Text>
            </View>
          )}
        </View>
        <View className="mt-0.5 flex-row flex-wrap items-center gap-x-2">
          <Text
            className="text-xs"
            style={{
              color: overdue ? RED_400 : dueToday ? ORANGE_400 : c.textMuted,
            }}
          >
            {dueToday
              ? t("routineRow.today")
              : new Date(scheduledDate + "T00:00:00").toLocaleDateString(
                  i18n.language
                )}
          </Text>
          {project && (
            <View className="flex-row items-center gap-1">
              <View
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: projectDot ?? c.textMuted }}
              />
              <Text className="text-xs text-text-muted">{project.name}</Text>
            </View>
          )}
          {!!routine.description && (
            <Text className="text-xs text-text-muted">· {routine.description}</Text>
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
            routine.archived ? t("routineRow.unarchiveAria") : t("routineRow.archiveAria")
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
      {onDelete && (
        <Pressable
          onPress={() => onDelete(routine.id)}
          accessibilityRole="button"
          accessibilityLabel={t("routineRow.deleteAria")}
          hitSlop={8}
        >
          <X size={16} color={c.textMuted} />
        </Pressable>
      )}
    </View>
  );
}
