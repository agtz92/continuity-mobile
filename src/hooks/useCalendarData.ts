import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { buildDayEntries } from "@/components/calendar/entries";
import { projectColor } from "@/components/calendar/parts";
import { calendarTasks, summarizeRange } from "@/components/calendar/summary";
import { useDashboardData } from "@/hooks/useDashboardData";
import {
  dayLoad,
  isSameMonth,
  monthMatrix,
  rollupByProject,
  routineItemsByDay,
  tasksByDay,
  weekDays,
  type CalendarView,
  type LoadLevel,
} from "@/lib/calendar";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Todo lo que el calendario deriva de los datos del dashboard para el periodo
 * visible: días, cubetas por día, resumen del titular, barras y carga del Mes
 * (una vez por mes, no por celda) y los ítems del día enfocado (el de la vista
 * Día o el seleccionado en el Mes).
 */
export function useCalendarData({
  view,
  refISO,
  focusISO,
  showTasks,
}: {
  view: CalendarView;
  refISO: string;
  focusISO: string;
  showTasks: boolean;
}) {
  const { t, i18n } = useTranslation();
  const c = useThemeColors();
  const locale = i18n.language || "en";
  const data = useDashboardData();
  const { projects, tasks, routines, routineOccurrences, categoryById } = data;

  const refDate = useMemo(() => new Date(refISO + "T00:00:00"), [refISO]);
  const { days, weeks, fromISO, toISO } = useMemo(() => {
    if (view === "day") return { days: [refISO], weeks: [] as string[][], fromISO: refISO, toISO: refISO };
    if (view === "week") {
      const d = weekDays(refDate);
      return { days: d, weeks: [] as string[][], fromISO: d[0], toISO: d[6] };
    }
    const w = monthMatrix(refDate);
    return { days: [] as string[], weeks: w, fromISO: w[0][0], toISO: w[w.length - 1][6] };
  }, [view, refISO, refDate]);

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  // Espejo de Today/Tasks: las tareas de un proyecto cerrado salen del calendario.
  const visibleTasks = useMemo(() => calendarTasks(tasks, projectsById), [tasks, projectsById]);
  const tByDay = useMemo(() => tasksByDay(visibleTasks, fromISO, toISO), [visibleTasks, fromISO, toISO]);
  const rByDay = useMemo(
    () => routineItemsByDay(routines, routineOccurrences, fromISO, toISO),
    [routines, routineOccurrences, fromISO, toISO],
  );

  const summary = useMemo(() => {
    const range = view === "month" ? weeks.flat().filter((iso) => isSameMonth(iso, refDate)) : days;
    return summarizeRange(tByDay, rByDay, range);
  }, [view, weeks, days, refDate, tByDay, rByDay]);

  const month = useMemo(() => {
    const bars = new Map<string, string[]>();
    const levels = new Map<string, LoadLevel>();
    let overloaded = 0;
    for (const iso of weeks.flat()) {
      const dt = tByDay.get(iso) ?? [];
      const dr = rByDay.get(iso) ?? [];
      const list: string[] = [];
      for (const r of rollupByProject(dt, projectsById)) {
        const color = projectColor(r.project, categoryById, c);
        if (showTasks || !r.project) r.tasks.forEach(() => list.push(color));
        else list.push(color);
      }
      dr.forEach(() => list.push(c.accent));
      bars.set(iso, list);
      const level = dayLoad(dt, dr).level;
      levels.set(iso, level);
      if (level === "over" && isSameMonth(iso, refDate)) overloaded += 1;
    }
    return { barsByDay: bars, levelByDay: levels, overloaded };
  }, [weeks, tByDay, rByDay, projectsById, categoryById, c, showTasks, refDate]);

  const focusTasks = tByDay.get(focusISO);
  const focusRoutines = rByDay.get(focusISO);
  const focus = useMemo(
    () =>
      buildDayEntries(focusTasks ?? [], focusRoutines ?? [], showTasks, {
        projectsById,
        categoryById,
        colors: c,
        locale,
        t,
      }),
    [focusTasks, focusRoutines, showTasks, projectsById, categoryById, c, locale, t],
  );
  const focusLoad = useMemo(
    () => dayLoad(focusTasks ?? [], focusRoutines ?? []),
    [focusTasks, focusRoutines],
  );

  return {
    ...data,
    locale,
    refDate,
    days,
    weeks,
    projectsById,
    tByDay,
    rByDay,
    summary,
    ...month,
    focus,
    focusLoad,
  };
}
