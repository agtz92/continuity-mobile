import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeOut,
  interpolateColor,
  LinearTransition,
  useAnimatedStyle,
} from "react-native-reanimated";
import { Archive, ArchiveRestore, Pencil, Repeat } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { Routine } from "@/lib/types";
import { describeRecurrence } from "@/lib/recurrence";
import { daysOverdue, todayLocalISODate } from "@/lib/date";
import { confirmCompleted } from "@/lib/feedback";
import { alpha, categoryChipColors, useThemeColors } from "@/theme/useThemeColors";
import { Meta } from "@/components/ui/Meta";
import { IconAction } from "@/components/ui/IconAction";
import { TaskToggle } from "@/components/tasks/TaskToggle";
import { StrikeTitle } from "@/components/tasks/StrikeTitle";
import { InkBadge } from "@/components/tasks/InkBadge";
import { afterCue, useCue } from "@/components/tasks/cue";
import { newId } from "@/lib/outbox/ops";

/**
 * Fila de una ocurrencia de rutina, rediseño "Breathe". `scheduledDate` es el
 * día que representa; `occurrenceId` no es null si ya se completó ese día.
 *
 * Una tarjeta por fila: toggle de 28 px (punteado + ↻) · espina de 3 px ·
 * título a 17 px que envuelve · badge de estado y recurrencia/horas como
 * metadato · proyecto en su propia línea. A la derecha, **editar** y
 * **archivar** como `IconAction` de 44 px separados 8 (el archivado se queda en
 * la fila por decisión del dueño, no se mueve al formulario).
 *
 * Completar usa el mismo cue "Trazo" que `TaskRow` (ver `tasks/cue.ts`): el
 * cambio se manda a los 380 ms con un id propio de ocurrencia, que es lo que
 * "Deshacer" (`undoable`) usa para desmarcarla aunque siga en la cola.
 */
export const RoutineRow = memo(function RoutineRow({
  routine,
  scheduledDate,
  occurrenceId,
  project,
  onComplete,
  onUncomplete,
  onEdit,
  onArchive,
  undoable = false,
}: {
  routine: Routine;
  scheduledDate: string;
  occurrenceId: string | null;
  project?: { name: string; color: string } | null;
  onComplete: (
    routineId: string,
    scheduledDate: string,
    occurrenceId?: string
  ) => void | Promise<void>;
  onUncomplete: (occurrenceId: string) => void | Promise<void>;
  onEdit?: (r: Routine) => void;
  onArchive?: (r: Routine) => void | Promise<void>;
  // Borrar vive en el formulario (routine-form). Opcional sin usar para no
  // romper call sites.
  onDelete?: (id: string) => void | Promise<void>;
  /** Ofrecer "Deshacer" al completar (solo donde la fila sale de la lista). */
  undoable?: boolean;
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
  const serverDone = occurrenceId !== null;
  const today = todayLocalISODate();
  // Del servidor, no del optimista: durante el cue se apagan con la tinta.
  const overdue = !serverDone && scheduledDate < today;
  const dueToday = !serverDone && scheduledDate === today;

  const wasDone = useRef(serverDone);
  useEffect(() => {
    if (wasDone.current && !serverDone) setOptimisticDone(false);
    wasDone.current = serverDone;
  }, [serverDone]);

  const handleToggle = () => {
    if (isDone) {
      // Un-complete only once the server occurrence exists; ignore taps while
      // an optimistic completion is still in flight.
      if (occurrenceId) {
        setOptimisticDone(false);
        onUncomplete(occurrenceId);
      }
    } else {
      confirmCompleted();
      setOptimisticDone(true);
      const id = newId();
      afterCue(
        () => onComplete(routine.id, scheduledDate, id),
        undoable ? () => onUncomplete(id) : undefined
      );
    }
  };

  const lateDays = overdue ? daysOverdue(scheduledDate) : null;

  const borderColor = overdue
    ? alpha(c.signal, 0.3)
    : dueToday
      ? alpha(c.accent, 0.3)
      : c.line[14];
  const spineColor = overdue ? c.signal : dueToday ? c.accent : c.line[14];
  const borderDone = c.line[14];
  const spineDone = c.closed;

  const { ink } = useCue(isDone);
  const cardInk = useAnimatedStyle(() => ({
    borderColor: interpolateColor(ink.value, [0, 1], [borderColor, borderDone]),
    borderLeftColor: interpolateColor(ink.value, [0, 1], [spineColor, spineDone]),
  }));

  const projectDot = project ? categoryChipColors(project.color, c).dot : null;

  const badge = (label: string, tone: string) => (
    <InkBadge label={label} tone={tone} ink={ink} />
  );

  // Recurrencia · horas (· fecha si no es hoy ni vencida): metadato.
  const metaParts = [describeRecurrence(routine, recLabel)];
  if (routine.effortHours != null) metaParts.push(`${routine.effortHours}h`);
  if (!overdue && !dueToday && !serverDone) {
    metaParts.push(
      new Date(scheduledDate + "T00:00:00").toLocaleDateString(i18n.language, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    );
  }

  return (
    <Animated.View
      exiting={FadeOut.duration(160).easing(Easing.out(Easing.cubic))}
      layout={LinearTransition.duration(220)}
    >
      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            borderRadius: 10,
            borderWidth: 1,
            backgroundColor: c.surface,
            gap: 12,
            paddingVertical: 12,
            paddingLeft: 14,
            paddingRight: 6,
            borderLeftWidth: 3,
          },
          cardInk,
        ]}
      >
        <TaskToggle
          done={isDone}
          overdue={overdue}
          kind="routine"
          onToggle={handleToggle}
          label={isDone ? t("routineRow.markNotDone") : t("routineRow.markDone")}
        />

        <Pressable
          className="min-w-0 flex-1"
          onPress={onEdit ? () => onEdit(routine) : undefined}
          disabled={!onEdit}
          accessibilityRole={onEdit ? "button" : undefined}
          accessibilityLabel={routine.title}
        >
          <StrikeTitle done={isDone} color={c.text} fontSize={17} lineHeight={23}>
            {routine.title}
          </StrikeTitle>

          <View
            className="flex-row flex-wrap items-center"
            style={{ marginTop: 6, columnGap: 8, rowGap: 4 }}
          >
            {overdue && lateDays !== null
              ? badge(t("routineRow.overdueDays", { count: lateDays }), c.signal)
              : null}
            {dueToday ? badge(t("routineRow.todayBadge"), c.accent) : null}
            {/* La recurrencia y las horas son metadato, no señal. */}
            <View className="min-w-0 flex-shrink flex-row items-center" style={{ gap: 4 }}>
              <Repeat size={12} color={c.text5} />
              <Meta tone="muted" className="flex-shrink" numberOfLines={1} style={{ fontSize: 13 }}>
                {metaParts.join(" · ")}
              </Meta>
            </View>
          </View>

          {project ? (
            <View className="flex-row items-center" style={{ gap: 6, marginTop: 4 }}>
              <View
                className="rounded-full"
                style={{ width: 8, height: 8, backgroundColor: projectDot ?? c.text5 }}
              />
              <Text
                className="font-sans min-w-0 flex-shrink"
                numberOfLines={1}
                style={{ fontSize: 13, color: c.text3 }}
              >
                {project.name}
              </Text>
            </View>
          ) : null}

          {routine.description ? (
            <Text
              className="font-sans"
              numberOfLines={1}
              style={{ fontSize: 13, color: c.text3, marginTop: 2 }}
            >
              {routine.description}
            </Text>
          ) : null}
        </Pressable>

        {onEdit || onArchive ? (
          <View className="flex-row items-center" style={{ gap: 8 }}>
            {onEdit ? (
              <IconAction
                icon={Pencil}
                label={t("routineRow.editAria")}
                onPress={() => onEdit(routine)}
              />
            ) : null}
            {onArchive ? (
              <IconAction
                icon={routine.archived ? ArchiveRestore : Archive}
                label={
                  routine.archived
                    ? t("routineRow.unarchiveAria")
                    : t("routineRow.archiveAria")
                }
                onPress={() => void onArchive(routine)}
              />
            ) : null}
          </View>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
});
