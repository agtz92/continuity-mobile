import { memo, useState, type ReactNode } from "react";
import { BlockerBadge } from "@/components/ui/BlockerBadge";
import { BlockedTaskDialog } from "./BlockedTaskDialog";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeOut, LinearTransition } from "react-native-reanimated";
import { CalendarClock, CalendarPlus } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { Project, Task } from "@/lib/types";
import { daysOverdue, daysSince, isDueToday, isOverdue } from "@/lib/date";
import { confirmCompleted } from "@/lib/feedback";
import { Meta } from "@/components/ui/Meta";
import { alpha, useThemeColors } from "@/theme/useThemeColors";
import { TaskToggle } from "./TaskToggle";

/** Alto del botón de acción secundaria de la fila (Reschedule / Add date). */
const ROW_ACTION = 36;

/**
 * Fila de tarea (espejo de la web `tasks/TaskRow.tsx`), rediseño "Breathe".
 *
 * Una sola tarjeta por fila: toggle de 28 px · espina de 3 px (`signal`
 * vencida / `accent` hoy) · título a 17 px que **envuelve** (nunca
 * `numberOfLines`) · segunda línea con el badge de estado y el proyecto/horas
 * como metadato. Las vencidas exponen **solo "Reschedule"** (36 px, abre la
 * edición): "Move to today" se quitó por decisión de diseño.
 *
 * Completar da confirmación inmediata (haptic + toast) y un estado optimista;
 * la fila se desvanece cuando el refetch la saca de la lista.
 */
export const TaskRow = memo(function TaskRow({
  task,
  project,
  onToggle,
  onSchedule,
  onEdit,
  onLongPress,
  dragHandle,
}: {
  task: Task;
  project: Project | undefined;
  onToggle: (t: Task) => void | Promise<void>;
  // Delete moved into the edit modal (task-form); tapping the row opens it.
  // Kept optional so existing call sites don't break.
  onDelete?: (id: string) => void | Promise<void>;
  /** "Add date" en filas sin fecha: la programa para hoy. */
  onSchedule?: (t: Task) => void;
  onEdit?: (t: Task) => void;
  /** Long-press sobre la fila (reordenar en el detalle de proyecto). */
  onLongPress?: () => void;
  /** Slot a la derecha dentro de la tarjeta: el grip de 36×44 del detalle. */
  dragHandle?: ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const c = useThemeColors();
  const [optimisticDone, setOptimisticDone] = useState(false);
  const done = task.done || optimisticDone;
  const overdue = !done && isOverdue(task.dueDate);
  const dueToday = !done && isDueToday(task.dueDate);
  const isBlocked = !done && task.blockers.length > 0;
  const lateDays = overdue ? daysOverdue(task.dueDate) : null;

  const blockedDays = isBlocked
    ? daysSince(
        task.blockedSince ?? [...task.blockers].map((b) => b.created).sort()[0]
      ) ?? 0
    : 0;

  const [askBlocked, setAskBlocked] = useState(false);

  const borderColor = overdue
    ? alpha(c.signal, 0.3)
    : dueToday
      ? alpha(c.accent, 0.3)
      : c.line[14];
  const spineColor = overdue ? c.signal : dueToday ? c.accent : c.line[14];

  const handleToggle = () => {
    // Cerrar algo que sigue bloqueado no es una acción, es una pregunta: ¿se
    // levantó el bloqueo, o la tarea dejó de importar? Ver `BlockedTaskDialog`.
    // Desmarcar una tarea ya hecha no pregunta nada.
    if (!done && isBlocked) {
      setAskBlocked(true);
      return;
    }
    if (!done) {
      setOptimisticDone(true);
      confirmCompleted(t("taskRow.completedToast"));
    } else {
      setOptimisticDone(false);
    }
    onToggle(task);
  };

  // Proyecto · horas · fecha (si no es hoy ni vencida): todo metadato.
  const metaParts: string[] = [];
  if (project) metaParts.push(project.name);
  if (task.effortHours != null) metaParts.push(`${task.effortHours}h`);
  if (task.dueDate && !overdue && !dueToday && !done) {
    metaParts.push(
      new Date(task.dueDate).toLocaleDateString(i18n.language, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    );
  }

  const badge = (label: string, tone: string) => (
    <View
      className="rounded-md px-1.5 py-0.5"
      style={{
        backgroundColor: alpha(tone, 0.14),
        borderWidth: 1,
        borderColor: alpha(tone, 0.35),
      }}
    >
      <Text
        className="font-sans-semibold uppercase"
        style={{ fontSize: 11, letterSpacing: 0.6, color: tone }}
      >
        {label}
      </Text>
    </View>
  );

  const showSchedule = !task.dueDate && !done && !!onSchedule;
  const showReschedule = overdue && !!onEdit;

  return (
    <Animated.View
      exiting={FadeOut.duration(220)}
      layout={LinearTransition.duration(220)}
    >
      {askBlocked && (
        <BlockedTaskDialog
          task={task}
          visible={askBlocked}
          onClose={() => setAskBlocked(false)}
          onResolve={() => {
            setOptimisticDone(true);
            confirmCompleted(t("taskRow.completedToast"));
            onToggle(task);
          }}
        />
      )}
      <View
        className="flex-row items-start rounded-lg border bg-surface"
        style={{
          gap: 12,
          padding: 14,
          borderColor,
          borderLeftWidth: 3,
          borderLeftColor: spineColor,
          opacity: isBlocked ? 0.6 : 1,
        }}
      >
        <TaskToggle
          done={done}
          overdue={overdue}
          blocked={isBlocked}
          onToggle={handleToggle}
          label={done ? t("taskRow.markNotDone") : t("taskRow.markDone")}
        />

        <Pressable
          className="min-w-0 flex-1"
          onPress={onEdit ? () => onEdit(task) : undefined}
          onLongPress={onLongPress}
          disabled={!onEdit && !onLongPress}
          accessibilityRole={onEdit ? "button" : undefined}
          accessibilityLabel={task.title}
        >
          {/* Título: envuelve, nunca se corta. */}
          <Text
            className={
              "font-sans " + (done ? "text-text-muted line-through" : "text-text")
            }
            style={{ fontSize: 17, lineHeight: 23 }}
          >
            {task.title}
          </Text>

          <View
            className="flex-row flex-wrap items-center"
            style={{ marginTop: 6, columnGap: 8, rowGap: 4 }}
          >
            {overdue && lateDays !== null
              ? badge(t("taskRow.overdueDays", { count: lateDays }), c.signal)
              : null}
            {dueToday ? badge(t("taskRow.todayBadge"), c.accent) : null}
            {/* El mismo badge que en web: trama + ✕ + días, NUNCA solo color. */}
            {isBlocked ? <BlockerBadge compact label since={blockedDays} /> : null}
            {metaParts.length > 0 ? (
              <Meta tone="muted" className="flex-shrink" numberOfLines={1} style={{ fontSize: 13 }}>
                {metaParts.join(" · ")}
              </Meta>
            ) : null}
          </View>

          {showReschedule || showSchedule ? (
            <View className="flex-row" style={{ marginTop: 10 }}>
              <Pressable
                onPress={() =>
                  showReschedule ? onEdit!(task) : onSchedule!(task)
                }
                accessibilityRole="button"
                accessibilityLabel={
                  showReschedule ? t("taskRow.reschedule") : t("taskRow.addDate")
                }
                hitSlop={4}
                className="flex-row items-center rounded-md border active:opacity-70"
                style={{
                  height: ROW_ACTION,
                  paddingHorizontal: 12,
                  gap: 6,
                  borderColor: c.line[18],
                  backgroundColor: c.bg,
                }}
              >
                {showReschedule ? (
                  <CalendarClock size={16} color={c.text3} />
                ) : (
                  <CalendarPlus size={16} color={c.accent} />
                )}
                <Text
                  className="font-sans-medium"
                  style={{
                    fontSize: 14,
                    color: showReschedule ? c.text2 : c.accent,
                  }}
                >
                  {showReschedule ? t("taskRow.reschedule") : t("taskRow.addDate")}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </Pressable>
        {dragHandle ?? null}
      </View>
    </Animated.View>
  );
});
