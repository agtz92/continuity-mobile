import type { TFunction } from "i18next";

import {
  blockMinutes,
  rollupByProject,
  timeToMinutes,
  type RoutineItem,
} from "@/lib/calendar";
import type { Category, Project, Task } from "@/lib/types";
import type { ThemeColors } from "@/theme/useThemeColors";
import type { CalendarEntry } from "./CalendarItemRow";
import { projectColor } from "./parts";
import { formatHours } from "./summary";

/** Bloque de la cuadrícula horaria del Día. */
export type TimedEntry = {
  key: string;
  kind: "task" | "routine";
  title: string;
  /** Minutos desde medianoche. */
  start: number;
  /** Duración en minutos (explícita → esfuerzo → 60). */
  minutes: number;
  spine: string;
  meta: string;
  completed: boolean;
  task?: Task;
  routineId?: string;
};

/**
 * "9:30" / "11:00": la hora sin AM/PM. En inglés en reloj de 12 h (la columna
 * de horas ya dice "9 AM"); en español en 24 h.
 */
export function clock(minutes: number, locale: string): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = String(minutes % 60).padStart(2, "0");
  const hh = locale.startsWith("en") ? ((h + 11) % 12) + 1 : h;
  return `${hh}:${m}`;
}

const hoursOf = (h: number | null | undefined) => (h != null && h > 0 ? formatHours(h) : null);
const join = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(" · ");

type Ctx = {
  projectsById: Map<string, Project>;
  categoryById: Record<string, Category>;
  colors: ThemeColors;
  locale: string;
  t: TFunction;
};

/**
 * Los ítems de un día, en el orden en que se leen: all-day primero (tareas o,
 * con "Show tasks" apagado, un renglón por proyecto; luego rutinas) y después
 * los que tienen hora, por hora. El Día pinta `allDay` como filas y `timed`
 * como bloques; la agenda del Mes pinta todo como filas (`agenda`).
 */
export function buildDayEntries(
  dayTasks: Task[],
  dayRoutines: RoutineItem[],
  showTasks: boolean,
  ctx: Ctx,
): { allDay: CalendarEntry[]; timed: TimedEntry[]; agenda: CalendarEntry[] } {
  const { projectsById, categoryById, colors: c, locale, t } = ctx;
  const projectOf = (task: Task) => (task.projectId ? projectsById.get(task.projectId) ?? null : null);

  const allDay: CalendarEntry[] = [];
  for (const r of rollupByProject(dayTasks.filter((tk) => !tk.dueTime), projectsById)) {
    const spine = projectColor(r.project, categoryById, c);
    if (showTasks || !r.project) {
      for (const task of r.tasks) {
        allDay.push({
          kind: "task",
          key: task.id,
          task,
          spine,
          meta: join(r.project?.name, hoursOf(task.effortHours)),
          minutes: null,
        });
      }
    } else {
      allDay.push({
        kind: "project",
        key: `project-${r.project.id}`,
        projectId: r.project.id,
        title: r.project.name,
        spine,
        meta: join(t("views.calendar.tasksCount", { count: r.tasks.length }), hoursOf(r.effortHours)),
        minutes: null,
      });
    }
  }
  for (const item of dayRoutines.filter((r) => !r.routine.timeOfDay)) {
    const doneAt = item.completedAt ? clock(minutesOfISO(item.completedAt), locale) : null;
    allDay.push({
      kind: "routine",
      key: `${item.routine.id}-${item.scheduledDate}`,
      item,
      meta: join(
        t("views.calendar.routineLabel"),
        item.completed
          ? doneAt
            ? t("views.calendar.doneAt", { time: doneAt })
            : t("views.calendar.done")
          : hoursOf(item.routine.effortHours),
      ),
      minutes: null,
    });
  }

  const timed: TimedEntry[] = [];
  for (const task of dayTasks) {
    const start = timeToMinutes(task.dueTime);
    if (start == null) continue;
    const project = projectOf(task);
    const minutes = blockMinutes(task.durationMinutes, task.effortHours);
    timed.push({
      key: task.id,
      kind: "task",
      title: task.title,
      start,
      minutes,
      spine: projectColor(project, categoryById, c),
      meta: join(clock(start, locale), formatHours(Math.round((minutes / 60) * 2) / 2 || 0.5), project?.name),
      completed: task.done,
      task,
    });
  }
  for (const item of dayRoutines) {
    const start = timeToMinutes(item.routine.timeOfDay);
    if (start == null) continue;
    const minutes = blockMinutes(item.routine.durationMinutes, item.routine.effortHours);
    const project = item.routine.projectId ? projectsById.get(item.routine.projectId) : undefined;
    timed.push({
      key: `${item.routine.id}-${item.scheduledDate}`,
      kind: "routine",
      title: item.routine.title,
      start,
      minutes,
      spine: c.accent,
      meta: join(clock(start, locale), formatHours(Math.round((minutes / 60) * 2) / 2 || 0.5), project?.name),
      completed: item.completed,
      routineId: item.routine.id,
    });
  }
  timed.sort((a, b) => a.start - b.start);

  // Agenda del Mes: los all-day dicen "All day" y los de hora llevan la hora
  // dentro de la meta, no en una columna aparte.
  const allDayLabel = t("views.calendar.allDay");
  const agenda: CalendarEntry[] = [
    ...allDay.map((e) => ({ ...e, meta: join(allDayLabel, e.meta) }) as CalendarEntry),
    ...timed.map((b): CalendarEntry => {
      if (b.kind === "task" && b.task) {
        return { kind: "task", key: b.key, task: b.task, spine: b.spine, meta: b.meta, minutes: b.start };
      }
      const item = dayRoutines.find((r) => `${r.routine.id}-${r.scheduledDate}` === b.key)!;
      return { kind: "routine", key: b.key, item, meta: b.meta, minutes: b.start };
    }),
  ];

  return { allDay, timed, agenda };
}

/** Minutos desde medianoche (hora local) de un datetime ISO. */
function minutesOfISO(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}
