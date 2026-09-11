import { useState } from "react";
import { BlockerBadge } from "@/components/ui/BlockerBadge";
import { BlockedTaskDialog } from "./BlockedTaskDialog";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeOut, LinearTransition } from "react-native-reanimated";
import {
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  Clock,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { Project, Task } from "@/lib/types";
import { daysOverdue, isDueToday, isOverdue,
  daysSince,
} from "@/lib/date";
import { confirmCompleted } from "@/lib/feedback";
import { alpha, useThemeColors } from "@/theme/useThemeColors";
import { EffortBadge } from "@/components/today/EffortBadge";
import { TaskToggle } from "./TaskToggle";


/**
 * Bordered task row (mirror of the web `tasks/TaskRow.tsx`). Row anatomy
 * (designer pass): circular TaskToggle · 3px urgency spine on the left edge ·
 * solid OVERDUE/TODAY badge that explains the drift ("Vencida · 3 días") ·
 * inline quick actions on overdue rows ("Mover a hoy" / "Reprogramar") so the
 * next decision is one tap away instead of buried in the edit modal.
 *
 * Marking done gives instant confirmation (success haptic + toast) and an
 * optimistic checked state, then the row fades out (Animated exiting) when the
 * refetch drops it from the list — instead of freezing then vanishing.
 */
export function TaskRow({
  task,
  project,
  onToggle,
  onSchedule,
  onEdit,
  onMoveToday,
}: {
  task: Task;
  project: Project | undefined;
  onToggle: (t: Task) => void | Promise<void>;
  // Delete moved into the edit modal (task-form); tapping the row opens it.
  // Kept optional so existing call sites don't break.
  onDelete?: (id: string) => void | Promise<void>;
  onSchedule?: (t: Task) => void;
  onEdit?: (t: Task) => void;
  /** One-tap "due date → today" for overdue rows. */
  onMoveToday?: (t: Task) => void | Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const c = useThemeColors();
  const [optimisticDone, setOptimisticDone] = useState(false);
  const done = task.done || optimisticDone;
  const overdue = !done && isOverdue(task.dueDate);
  const dueToday = !done && isDueToday(task.dueDate);
  const isBlocked = !done && task.blockers.length > 0;
  const lateDays = overdue ? daysOverdue(task.dueDate) : null;
  // `blockedReason` lo deriva el servidor; el cálculo local es el respaldo
  // para formas cacheadas de antes.
  const blockReason = isBlocked
    ? task.blockedReason ||
      task.blockers.find((b) => b.externalDescription)?.externalDescription
    : undefined;

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
    : c.border;
  const spineColor = overdue
    ? c.signal
    : dueToday
    ? c.accent
    : c.border;

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
        className="flex-row items-start gap-3 rounded-lg border bg-surface p-3"
        style={{
          borderColor,
          borderLeftWidth: 3,
          borderLeftColor: spineColor,
          opacity: isBlocked ? 0.6 : 1,
        }}
      >
        <View className="mt-0.5">
          <TaskToggle
            done={done}
            overdue={overdue}
            blocked={isBlocked}
            onToggle={handleToggle}
            label={done ? t("taskRow.markNotDone") : t("taskRow.markDone")}
          />
        </View>

        <Pressable
          className="min-w-0 flex-1"
          onPress={onEdit ? () => onEdit(task) : undefined}
          disabled={!onEdit}
        >
          <View className="flex-row flex-wrap items-center gap-2">
            <Text
              className={"font-sans " + 
                "text-base " +
                (done ? "text-text-muted line-through" : "text-text")
              }
            >
              {task.title}
            </Text>
            {task.effortHours != null && (
              <EffortBadge hours={task.effortHours} />
            )}
          </View>
          <View className="mt-1 flex-row flex-wrap items-center gap-x-2 gap-y-1">
            {overdue && lateDays !== null && (
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
                  {t("taskRow.overdueDays", { count: lateDays })}
                </Text>
              </View>
            )}
            {dueToday && (
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
                  {t("taskRow.todayBadge")}
                </Text>
              </View>
            )}
            {/* El mismo badge que en web: trama + ✕ + días, NUNCA solo color,
                para que se lea en una captura en escala de grises. Antes aquí
                había una pastilla gris propia con un hex de Tailwind — un
                bloqueo no es un dato apagado, es lo único que la app no puede
                resolver sola. */}
            {isBlocked && (
              <BlockerBadge compact label since={blockedDays} />
            )}
            {project && (
              <Text className="font-sans text-xs text-text-muted">{project.name}</Text>
            )}
            {task.dueDate ? (
              !overdue &&
              !dueToday && (
                <Text className="font-sans text-xs" style={{ color: c.textMuted }}>
                  · {new Date(task.dueDate).toLocaleDateString(i18n.language)}
                </Text>
              )
            ) : onSchedule ? (
              <Pressable
                className="flex-row items-center gap-1"
                onPress={() => onSchedule(task)}
                hitSlop={6}
              >
                <CalendarPlus size={12} color={c.accent} />
                <Text className="font-sans text-xs" style={{ color: c.accent }}>
                  {t("taskRow.addDate")}
                </Text>
              </Pressable>
            ) : null}
          </View>
          {overdue && (onMoveToday || onEdit) && (
            <View className="mt-2 flex-row items-center gap-1.5">
              {onMoveToday && (
                <Pressable
                  onPress={() => onMoveToday(task)}
                  className="flex-row items-center gap-1 rounded-md border px-2 py-1"
                  style={{ borderColor: alpha(c.accent, 0.35) }}
                  hitSlop={4}
                >
                  <CalendarCheck size={12} color={c.accent} />
                  <Text className="font-sans text-[11px]" style={{ color: c.accent }}>
                    {t("taskRow.moveToToday")}
                  </Text>
                </Pressable>
              )}
              {onEdit && (
                <Pressable
                  onPress={() => onEdit(task)}
                  className="flex-row items-center gap-1 rounded-md border px-2 py-1"
                  style={{ borderColor: c.border }}
                  hitSlop={4}
                >
                  <CalendarClock size={12} color={c.textMuted} />
                  <Text className="font-sans text-[11px]" style={{ color: c.textMuted }}>
                    {t("taskRow.reschedule")}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
}
