import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { TaskToggle } from "@/components/tasks/TaskToggle";
import { Meta } from "@/components/ui/Meta";
import {
  OVERLOAD_HOURS,
  dayLoad,
  rollupByProject,
  type DayLoad,
  type ProjectRollup,
  type RoutineItem,
} from "@/lib/calendar";
import type { Category, Project, Task } from "@/lib/types";
import { categoryChipColors, type ThemeColors } from "@/theme/useThemeColors";
import { formatHours } from "./summary";
import type { CalendarHandlers } from "./parts";

/** Barra de carga de 3 px: ancho por horas, color por nivel. */
function LoadRule({ load, colors }: { load: DayLoad; colors: ThemeColors }) {
  const color =
    load.level === "over" ? colors.signal : colors.accent;
  const pct =
    load.hours <= 0 ? 0 : Math.max(8, Math.min(100, Math.round((load.hours / OVERLOAD_HOURS) * 100)));
  return (
    <View
      accessibilityLabel={formatHours(load.hours)}
      style={{ height: 3, borderRadius: 2, backgroundColor: colors.line[10], marginBottom: 6 }}
    >
      <View style={{ height: 3, borderRadius: 2, width: `${pct}%`, backgroundColor: color }} />
    </View>
  );
}

/** Meta a la derecha de un ítem: horas y, si el día ya pasó, "late" en `signal`. */
function ItemMeta({ hours, late, colors }: { hours: number | null; late: boolean; colors: ThemeColors }) {
  const { t } = useTranslation();
  if (hours == null && !late) return null;
  return (
    <Meta variant="cintillo" tone="inherit" style={{ color: late ? colors.signal : colors.text3 }}>
      {[hours != null ? formatHours(hours) : null, late ? t("views.calendar.late") : null]
        .filter(Boolean)
        .join(" · ")}
    </Meta>
  );
}

const TaskItem = memo(function TaskItem({
  task,
  late,
  colors,
  handlers,
}: {
  task: Task;
  late: boolean;
  colors: ThemeColors;
  handlers: CalendarHandlers;
}) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center" style={{ minHeight: 44, gap: 12 }}>
      <TaskToggle
        done={task.done}
        overdue={late}
        onToggle={() => void handlers.onToggleTask(task)}
        label={t("views.calendar.completeTask", { title: task.title })}
      />
      <Pressable
        onPress={() => handlers.onOpenTask(task.id)}
        accessibilityRole="button"
        accessibilityLabel={task.title}
        className="flex-1 justify-center active:opacity-60"
        style={{ minHeight: 44 }}
      >
        <Text className="font-sans" style={{ fontSize: 15, lineHeight: 20, color: colors.text }}>
          {task.title}
        </Text>
      </Pressable>
      <ItemMeta hours={task.effortHours ?? null} late={late} colors={colors} />
    </View>
  );
});

/** Rutina: solo lectura aquí (no se completa desde el calendario); tocar abre su edición. */
const RoutineItemRow = memo(function RoutineItemRow({
  item,
  late,
  colors,
  onOpen,
}: {
  item: RoutineItem;
  late: boolean;
  colors: ThemeColors;
  onOpen: (routineId: string) => void;
}) {
  const { t } = useTranslation();
  const open = () => onOpen(item.routine.id);
  return (
    <View className="flex-row items-center" style={{ minHeight: 44, gap: 12, opacity: item.completed ? 0.6 : 1 }}>
      <TaskToggle
        kind="routine"
        done={item.completed}
        overdue={late && !item.completed}
        onToggle={open}
        label={t("views.calendar.editRoutine", { title: item.routine.title })}
      />
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={item.routine.title}
        className="flex-1 justify-center active:opacity-60"
        style={{ minHeight: 44 }}
      >
        <Text
          className="font-sans"
          style={{
            fontSize: 15,
            lineHeight: 20,
            color: item.completed ? colors.text3 : colors.text,
            textDecorationLine: item.completed ? "line-through" : "none",
          }}
        >
          {item.routine.title}
        </Text>
      </Pressable>
      <ItemMeta
        hours={item.completed ? null : item.routine.effortHours ?? null}
        late={late && !item.completed}
        colors={colors}
      />
    </View>
  );
});

/** Un proyecto del día (vista por defecto): una fila con su conteo de tareas. */
const ProjectItem = memo(function ProjectItem({
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
  const { t } = useTranslation();
  const { project, tasks, effortHours } = rollup;
  const cat = project?.categoryId ? categoryById[project.categoryId] : undefined;
  const bar = cat ? categoryChipColors(cat.color, colors).dot : colors.line[34];
  return (
    <Pressable
      onPress={() => project && onOpenProject(project.id)}
      disabled={!project}
      accessibilityRole="button"
      accessibilityLabel={`${project?.name ?? "—"}, ${t("views.calendar.taskCount", { count: tasks.length })}`}
      className="flex-row items-center active:opacity-60"
      style={{ minHeight: 44, gap: 12 }}
    >
      <View
        className="items-center justify-center rounded-md"
        style={{ width: 24, height: 24, borderWidth: 1, borderColor: colors.line[22], borderLeftWidth: 3, borderLeftColor: bar }}
      >
        <Text className="font-sans-semibold" style={{ fontSize: 11, color: colors.text2 }}>
          {tasks.length}
        </Text>
      </View>
      <Text className="font-sans flex-1" style={{ fontSize: 15, lineHeight: 20, color: colors.text }}>
        {project?.name ?? "—"}
      </Text>
      {effortHours > 0 ? (
        <Meta variant="cintillo" tone="muted">
          {formatHours(effortHours)}
        </Meta>
      ) : null}
    </Pressable>
  );
});

/**
 * Semana como filas rayadas (2d): columna de 40 px (día en versalitas +
 * número 22 px display) e ítems a 15 px con toggle de 24 y meta a la derecha.
 * Hoy lleva espina `accent` y barra de carga de 3 px; un día sobrecargado
 * también muestra su barra (en `signal`). Días vacíos: "Nothing scheduled".
 */
export function WeekAgenda({
  days,
  todayISO,
  locale,
  tasksByDay,
  routinesByDay,
  projectsById,
  categoryById,
  showTasks,
  showLoad,
  colors,
  handlers,
  emptyLabel,
}: {
  days: string[];
  todayISO: string;
  locale: string;
  tasksByDay: Map<string, Task[]>;
  routinesByDay: Map<string, RoutineItem[]>;
  projectsById: Map<string, Project>;
  categoryById: Record<string, Category>;
  showTasks: boolean;
  showLoad: boolean;
  colors: ThemeColors;
  handlers: CalendarHandlers;
  emptyLabel: string;
}) {
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.line[14] }}>
      {days.map((iso) => {
        const dayTasks = tasksByDay.get(iso) ?? [];
        const dayRoutines = routinesByDay.get(iso) ?? [];
        const rollups = rollupByProject(dayTasks, projectsById);
        const load = dayLoad(dayTasks, dayRoutines);
        const isToday = iso === todayISO;
        const past = iso < todayISO;
        const d = new Date(iso + "T00:00:00");
        const empty = dayTasks.length === 0 && dayRoutines.length === 0;
        const showBar = showLoad && !empty && (isToday || load.level === "over");
        const numberColor = isToday ? colors.accent : empty && past ? colors.text5 : colors.text;
        return (
          <View
            key={iso}
            className="flex-row"
            style={{
              paddingVertical: 12,
              gap: 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.line[14],
            }}
          >
            {isToday ? (
              <View
                style={{
                  position: "absolute",
                  left: -12,
                  top: 8,
                  bottom: 8,
                  width: 3,
                  borderRadius: 2,
                  backgroundColor: colors.accent,
                }}
              />
            ) : null}
            <View
              accessible
              accessibilityRole="header"
              accessibilityLabel={d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
              style={{ width: 40, paddingTop: 4 }}
            >
              <Meta
                variant="cintillo"
                tone="inherit"
                style={{ color: isToday ? colors.accent : empty && past ? colors.text5 : colors.text3 }}
              >
                {d.toLocaleDateString(locale, { weekday: "short" }).replace(".", "")}
              </Meta>
              <Text
                className="font-display"
                style={{ fontSize: 22, lineHeight: 26, letterSpacing: -0.5, color: numberColor }}
              >
                {d.getDate()}
              </Text>
            </View>
            <View className="min-w-0 flex-1" style={{ justifyContent: "center" }}>
              {showBar ? <LoadRule load={load} colors={colors} /> : null}
              {empty ? (
                <Text className="font-sans" style={{ fontSize: 15, color: colors.text5, paddingVertical: 12 }}>
                  {emptyLabel}
                </Text>
              ) : (
                <>
                  {rollups.map((r, i) =>
                    showTasks || !r.project ? (
                      r.tasks.map((tk) => (
                        <TaskItem key={tk.id} task={tk} late={past} colors={colors} handlers={handlers} />
                      ))
                    ) : (
                      <ProjectItem
                        key={r.project?.id ?? `none-${i}`}
                        rollup={r}
                        categoryById={categoryById}
                        colors={colors}
                        onOpenProject={handlers.onOpenProject}
                      />
                    ),
                  )}
                  {dayRoutines.map((item) => (
                    <RoutineItemRow
                      key={`${item.routine.id}-${item.scheduledDate}`}
                      item={item}
                      late={past}
                      colors={colors}
                      onOpen={handlers.onOpenRoutine}
                    />
                  ))}
                </>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
