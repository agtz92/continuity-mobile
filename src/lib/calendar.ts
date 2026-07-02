import type { Project, Routine, RoutineOccurrence, Task } from "./types";
import { toLocalISO, weekStartISO } from "./date";
import { computeDueDates } from "./recurrence";

/**
 * Pure helpers for the Calendar view (mirror of the web app's src/lib/calendar.ts).
 * No React, no theme, no I/O — everything is derived from the dashboard data the
 * app already loads (projects, tasks, routines, occurrences). Routine occurrences
 * are expanded client-side with `computeDueDates`.
 */

/** Day is "overloaded" at/above this many estimated hours. Single knob. */
export const OVERLOAD_HOURS = 8;

export type CalendarView = "day" | "week" | "month";

export type LoadLevel = "calm" | "busy" | "over";

export interface RoutineItem {
  routine: Routine;
  scheduledDate: string; // YYYY-MM-DD
  completed: boolean;
  /** Id of the completion row when completed (needed to un-complete). */
  occurrenceId: string | null;
}

export interface ProjectRollup {
  /** null = tasks with no project. */
  project: Project | null;
  tasks: Task[];
  /** Sum of known effortHours (nulls excluded). */
  effortHours: number;
}

export interface DayLoad {
  hours: number;
  /** How many items contributed no estimate (effortHours == null). */
  unestimated: number;
  level: LoadLevel;
}

// ---------- date math (local, TZ-safe) ----------

const parseISO = (iso: string): Date => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

const addDays = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

export const addDaysISO = (iso: string, n: number): string =>
  toLocalISO(addDays(parseISO(iso), n));

/** 7 ISO days for the Monday-anchored week containing `ref`. */
export const weekDays = (ref: Date): string[] => {
  const start = parseISO(weekStartISO(ref));
  return Array.from({ length: 7 }, (_, i) => toLocalISO(addDays(start, i)));
};

/**
 * Weeks (rows) of 7 ISO days covering the month of `ref`, Monday-anchored,
 * with leading/trailing days from adjacent months. 5 or 6 rows.
 */
export const monthMatrix = (ref: Date): string[][] => {
  const first = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const lastDay = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  const lastISO = toLocalISO(lastDay);
  let cur = parseISO(weekStartISO(first));
  const weeks: string[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(toLocalISO(cur));
      cur = addDays(cur, 1);
    }
    weeks.push(week);
    if (week[6] >= lastISO) break;
  }
  return weeks;
};

export const isSameMonth = (iso: string, ref: Date): boolean => {
  const d = parseISO(iso);
  return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
};

// ---------- bucketing ----------

/** Local YYYY-MM-DD a task's due date falls on, or null if undated. */
const taskDay = (t: Task): string | null =>
  t.dueDate ? toLocalISO(new Date(t.dueDate)) : null;

/**
 * Map<isoDay, Task[]> for open (not done) tasks whose due date is within
 * [fromISO, toISO]. Done tasks are excluded — the calendar is forward-looking.
 */
export const tasksByDay = (
  tasks: Task[],
  fromISO: string,
  toISO: string
): Map<string, Task[]> => {
  const out = new Map<string, Task[]>();
  for (const t of tasks) {
    if (t.done) continue;
    const day = taskDay(t);
    if (!day || day < fromISO || day > toISO) continue;
    const list = out.get(day);
    if (list) list.push(t);
    else out.set(day, [t]);
  }
  return out;
};

/**
 * Map<isoDay, RoutineItem[]> for non-archived routines, expanding each
 * recurrence across [fromISO, toISO] and marking completion from occurrences.
 */
export const routineItemsByDay = (
  routines: Routine[],
  occurrences: RoutineOccurrence[],
  fromISO: string,
  toISO: string
): Map<string, RoutineItem[]> => {
  const out = new Map<string, RoutineItem[]>();
  // date -> occurrenceId, per routine (occurrence rows = completions).
  const occByRoutine = new Map<string, Map<string, string>>();
  for (const o of occurrences) {
    let m = occByRoutine.get(o.routineId);
    if (!m) {
      m = new Map<string, string>();
      occByRoutine.set(o.routineId, m);
    }
    m.set(o.scheduledDate, o.id);
  }
  for (const routine of routines) {
    if (routine.archived) continue;
    const occ = occByRoutine.get(routine.id);
    for (const day of computeDueDates(routine, fromISO, toISO)) {
      const occurrenceId = occ?.get(day) ?? null;
      const item: RoutineItem = {
        routine,
        scheduledDate: day,
        completed: occurrenceId != null,
        occurrenceId,
      };
      const list = out.get(day);
      if (list) list.push(item);
      else out.set(day, [item]);
    }
  }
  return out;
};

// ---------- project rollup (default, project-level view) ----------

/**
 * Group a day's tasks by project. Default view shows ONE chip per project
 * (with a count) instead of every task. Sorted by task count desc.
 */
export const rollupByProject = (
  tasksOfDay: Task[],
  projectsById: Map<string, Project>
): ProjectRollup[] => {
  const groups = new Map<string, ProjectRollup>();
  for (const t of tasksOfDay) {
    const key = t.projectId ?? "__none__";
    let g = groups.get(key);
    if (!g) {
      g = {
        project: t.projectId ? projectsById.get(t.projectId) ?? null : null,
        tasks: [],
        effortHours: 0,
      };
      groups.set(key, g);
    }
    g.tasks.push(t);
    if (t.effortHours != null) g.effortHours += t.effortHours;
  }
  return Array.from(groups.values()).sort(
    (a, b) => b.tasks.length - a.tasks.length
  );
};

// ---------- load (Carga) ----------

export const loadLevel = (hours: number): LoadLevel => {
  if (hours >= OVERLOAD_HOURS) return "over";
  if (hours >= OVERLOAD_HOURS * 0.6) return "busy";
  return "calm";
};

/** Estimated hours for a day = open task effort + routine effort (nulls skipped). */
export const dayLoad = (
  tasksOfDay: Task[],
  routinesOfDay: RoutineItem[]
): DayLoad => {
  let hours = 0;
  let unestimated = 0;
  for (const t of tasksOfDay) {
    if (t.effortHours != null) hours += t.effortHours;
    else unestimated += 1;
  }
  for (const r of routinesOfDay) {
    if (r.completed) continue; // done routines don't add to remaining load
    if (r.routine.effortHours != null) hours += r.routine.effortHours;
    else unestimated += 1;
  }
  hours = Math.round(hours * 100) / 100;
  return { hours, unestimated, level: loadLevel(hours) };
};

// ---------- Day (hourly) view ----------

/** Minutes since midnight for a "HH:MM[:SS]" string, or null. */
export const timeToMinutes = (hms: string | null): number | null => {
  if (!hms) return null;
  const [h, m] = hms.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0);
};

/** Locale-formatted "9 AM" / "9:30" label for a "HH:MM[:SS]" string. */
export const formatTime = (
  hms: string | null,
  locale: string
): string | null => {
  const mins = timeToMinutes(hms);
  if (mins == null) return null;
  const d = new Date(2000, 0, 1, Math.floor(mins / 60), mins % 60);
  return d.toLocaleTimeString(locale, {
    hour: "numeric",
    ...(mins % 60 ? { minute: "2-digit" } : {}),
  });
};

/** Block length in minutes: explicit duration → effort → 60min default. */
export const blockMinutes = (
  durationMinutes: number | null,
  effortHours: number | null
): number => {
  if (durationMinutes != null) return durationMinutes;
  if (effortHours != null) return Math.round(effortHours * 60);
  return 60;
};

/**
 * [startHour, endHour] to render in the Day grid. Defaults to 7–21 and
 * expands to fit any timed item that falls outside it.
 */
export const hoursRange = (
  startsMinutes: number[],
  defaultStart = 7,
  defaultEnd = 21
): [number, number] => {
  let start = defaultStart;
  let end = defaultEnd;
  for (const m of startsMinutes) {
    const h = Math.floor(m / 60);
    if (h < start) start = h;
    if (h + 1 > end) end = Math.min(24, h + 1);
  }
  return [start, end];
};
