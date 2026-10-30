import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { TaskToggle } from "@/components/tasks/TaskToggle";
import { RuledRow } from "@/components/ui/RuledRow";
import type { RoutineItem } from "@/lib/calendar";
import type { Task } from "@/lib/types";
import { useThemeColors } from "@/theme/useThemeColors";
import type { CalendarHandlers } from "./parts";

export type CalendarEntry =
  | { kind: "task"; key: string; task: Task; spine: string; meta: string; minutes: number | null }
  | { kind: "routine"; key: string; item: RoutineItem; meta: string; minutes: number | null }
  | {
      kind: "project";
      key: string;
      projectId: string | null;
      title: string;
      spine: string;
      meta: string;
      minutes: null;
    };

/**
 * Fila de ítem del calendario (all-day del Día y agenda del Mes): toggle de 28,
 * espina de 3 px del color de la categoría (`accent` en rutinas), título 16/22
 * que envuelve y meta en versalitas de 12 px. Las rutinas muestran su estado
 * pero no se completan aquí: tocar abre su edición.
 */
export const CalendarItemRow = memo(function CalendarItemRow({
  entry,
  handlers,
  last,
}: {
  entry: CalendarEntry;
  handlers: CalendarHandlers;
  last: boolean;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();

  const done = entry.kind === "routine" ? entry.item.completed : false;
  const title =
    entry.kind === "task" ? entry.task.title : entry.kind === "routine" ? entry.item.routine.title : entry.title;
  const spine = entry.kind === "routine" ? (done ? null : c.accent) : entry.spine;

  const open = () => {
    if (entry.kind === "task") handlers.onOpenTask(entry.task.id);
    else if (entry.kind === "routine") handlers.onOpenRoutine(entry.item.routine.id);
    else if (entry.projectId) handlers.onOpenProject(entry.projectId);
  };

  const toggle =
    entry.kind === "task" ? (
      <TaskToggle
        done={entry.task.done}
        onToggle={() => void handlers.onToggleTask(entry.task)}
        label={t("views.calendar.completeTask", { title })}
      />
    ) : entry.kind === "routine" ? (
      <TaskToggle kind="routine" done={done} onToggle={open} label={t("views.calendar.editRoutine", { title })} />
    ) : null;

  return (
    <RuledRow spine={spine} leading={toggle} last={last}>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={title}
        className="active:opacity-60"
        style={{ minHeight: 32, justifyContent: "center" }}
      >
        <Text
          className="font-sans"
          style={{
            fontSize: 16,
            lineHeight: 22,
            color: done ? c.text3 : c.text,
            textDecorationLine: done ? "line-through" : "none",
          }}
        >
          {title}
        </Text>
        {entry.meta ? (
          <View style={{ marginTop: 3 }}>
            <Text
              numberOfLines={1}
              className="font-sans-semibold uppercase"
              style={{ fontSize: 12, letterSpacing: 0.6, color: c.text3 }}
            >
              {entry.meta}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </RuledRow>
  );
});
