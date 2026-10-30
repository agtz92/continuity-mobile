import { isDailyViewStatus } from "@/lib/projectStatus";
import {
  dayLoad,
  routineItemsByDay,
  tasksByDay,
  type RoutineItem,
} from "@/lib/calendar";
import type { Project, Routine, RoutineOccurrence, Task } from "@/lib/types";

/**
 * Tasks the calendar shows: standalone ones and those of a live project.
 * Tasks of a closed project (paused/stalled/killed/archived) are withdrawn,
 * mirroring Today/Tasks.
 */
export function calendarTasks(tasks: Task[], projectsById: Map<string, Project>): Task[] {
  return tasks.filter((task) => {
    if (!task.projectId) return true;
    const parent = projectsById.get(task.projectId);
    return parent ? isDailyViewStatus(parent.status) : true;
  });
}

export type RangeSummary = {
  tasks: number;
  routines: number;
  /** Estimated remaining hours (open tasks + pending routines), rounded to 0.5. */
  hours: number;
};

/**
 * Counts for a calendar range: the "8 tasks · 4 routines · 13h" meta of the
 * period headline and the Calendar tile in More. Same buckets the calendar
 * renders, so the numbers match what the user sees.
 */
export function summarizeRange(
  tByDay: Map<string, Task[]>,
  rByDay: Map<string, RoutineItem[]>,
  days: string[],
): RangeSummary {
  let tasks = 0;
  let routines = 0;
  let hours = 0;
  for (const iso of days) {
    const dt = tByDay.get(iso) ?? [];
    const dr = rByDay.get(iso) ?? [];
    tasks += dt.length;
    routines += dr.length;
    hours += dayLoad(dt, dr).hours;
  }
  return { tasks, routines, hours: Math.round(hours * 2) / 2 };
}

/** Same as `summarizeRange`, building the day buckets itself. */
export function summarizeDays(
  tasks: Task[],
  projectsById: Map<string, Project>,
  routines: Routine[],
  occurrences: RoutineOccurrence[],
  days: string[],
): RangeSummary {
  if (days.length === 0) return { tasks: 0, routines: 0, hours: 0 };
  const from = days[0];
  const to = days[days.length - 1];
  return summarizeRange(
    tasksByDay(calendarTasks(tasks, projectsById), from, to),
    routineItemsByDay(routines, occurrences, from, to),
    days,
  );
}

/** "13h", "½h", "7½h", "1.3h" — compact hours for metadata. */
export function formatHours(h: number): string {
  const whole = Math.floor(h);
  if (h - whole === 0.5) return `${whole || ""}½h`;
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
}
