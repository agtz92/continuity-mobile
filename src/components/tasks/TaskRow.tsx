import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { BlockerBadge } from "@/components/ui/BlockerBadge";
import { BlockedTaskDialog } from "./BlockedTaskDialog";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeOut,
  interpolateColor,
  LinearTransition,
  useAnimatedStyle,
} from "react-native-reanimated";
import { CalendarClock, CalendarPlus } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { Project, Task } from "@/lib/types";
import { daysOverdue, daysSince, isDueToday, isOverdue } from "@/lib/date";
import { confirmCompleted } from "@/lib/feedback";
import { Meta } from "@/components/ui/Meta";
import { alpha, useThemeColors } from "@/theme/useThemeColors";
import { TaskToggle } from "./TaskToggle";
import { StrikeTitle } from "./StrikeTitle";
import { InkBadge } from "./InkBadge";
import { afterCue, useCue } from "./cue";

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
 * Completar (cue "Trazo", ver `cue.ts`): haptic y cue en el mismo frame, con
 * estado optimista; el cambio se manda a los 380 ms, cuando la fila ya dijo
 * "hecha", y entonces sale de la lista. Con `undoable` entra el toast
 * "Deshacer" (listas de las que la fila se va: Today, Tasks).
 */
export const TaskRow = memo(function TaskRow({
  task,
  project,
  onToggle,
  onSchedule,
  onEdit,
  onLongPress,
  dragHandle,
  undoable = false,
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
  /** Ofrecer "Deshacer" al completar (solo donde la fila sale de la lista). */
  undoable?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const c = useThemeColors();
  const [optimisticDone, setOptimisticDone] = useState(false);
  const done = task.done || optimisticDone;
  // El estado de la fila sale del servidor, no del optimista: durante el cue
  // la espina y los badges se apagan con la tinta en vez de desaparecer.
  const overdue = !task.done && isOverdue(task.dueDate);
  const dueToday = !task.done && isDueToday(task.dueDate);
  const isBlocked = !done && task.blockers.length > 0;

  // Si la tarea vuelve a pendiente (Deshacer, otro dispositivo), el optimista
  // no puede dejarla marcada.
  const wasDone = useRef(task.done);
  useEffect(() => {
    if (wasDone.current && !task.done) setOptimisticDone(false);
    wasDone.current = task.done;
  }, [task.done]);
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
  const borderDone = c.line[14];
  const spineDone = c.closed;

  const { ink } = useCue(done);
  const cardInk = useAnimatedStyle(() => ({
    borderColor: interpolateColor(ink.value, [0, 1], [borderColor, borderDone]),
    borderLeftColor: interpolateColor(ink.value, [0, 1], [spineColor, spineDone]),
  }));

  const complete = () => {
    confirmCompleted();
    setOptimisticDone(true);
    afterCue(
      () => onToggle(task),
      undoable ? () => onToggle({ ...task, done: true }) : undefined
    );
  };

  const handleToggle = () => {
    // Cerrar algo que sigue bloqueado no es una acción, es una pregunta: ¿se
    // levantó el bloqueo, o la tarea dejó de importar? Ver `BlockedTaskDialog`.
    // Desmarcar una tarea ya hecha no pregunta nada.
    if (!done && isBlocked) {
      setAskBlocked(true);
      return;
    }
    if (!done) {
      complete();
    } else if (task.done) {
      setOptimisticDone(false);
      onToggle(task);
    }
    // Hecha en optimista y aún sin mandar: el toque se ignora.
  };

  // Proyecto · horas · fecha (si no es hoy ni vencida): todo metadato.
  const metaParts: string[] = [];
  if (project) metaParts.push(project.name);
  if (task.effortHours != null) metaParts.push(`${task.effortHours}h`);
  if (task.dueDate && !overdue && !dueToday && !task.done) {
    metaParts.push(
      new Date(task.dueDate).toLocaleDateString(i18n.language, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    );
  }

  const badge = (label: string, tone: string) => (
    <InkBadge label={label} tone={tone} ink={ink} />
  );

  const showSchedule = !task.dueDate && !task.done && !!onSchedule;
  const showReschedule = overdue && !!onEdit;

  return (
    <Animated.View
      exiting={FadeOut.duration(160).easing(Easing.out(Easing.cubic))}
      layout={LinearTransition.duration(220)}
    >
      {askBlocked && (
        <BlockedTaskDialog
          task={task}
          visible={askBlocked}
          onClose={() => setAskBlocked(false)}
          onResolve={complete}
        />
      )}
      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "flex-start",
            borderRadius: 10,
            borderWidth: 1,
            backgroundColor: c.surface,
            gap: 12,
            padding: 14,
            borderLeftWidth: 3,
            opacity: isBlocked ? 0.6 : 1,
          },
          cardInk,
        ]}
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
          <StrikeTitle done={done} color={c.text} fontSize={17} lineHeight={23}>
            {task.title}
          </StrikeTitle>

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
      </Animated.View>
    </Animated.View>
  );
});
