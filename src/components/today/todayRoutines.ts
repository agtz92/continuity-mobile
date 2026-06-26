/**
 * Lógica pura de "rutinas de hoy" para la pantalla Today (mobile). Extraído del
 * componente (ver AUDITORIA_CODIGO.md). Espeja el módulo de la web, pero
 * preserva el comportamiento actual del móvil: NO filtra por estado del proyecto
 * (solo excluye rutinas archivadas).
 */

import type { Routine, RoutineOccurrence } from "@/lib/types";
import { todayLocalISODate, toLocalISO } from "@/lib/date";
import { completedDatesFor, computeDueDates } from "@/lib/recurrence";

export interface TodayRoutineItem {
  routine: Routine;
  scheduledDate: string;
}

/** Días hacia atrás que recuperan atrasos recientes sin inflar la lista. */
const LOOKBACK_DAYS = 14;

/**
 * Ocurrencias de rutina pendientes hoy + atrasadas: expande cada rutina no
 * archivada a sus fechas debidas (ventana de 14 días hacia atrás) y descarta las
 * ya completadas. Orden ascendente por fecha.
 */
export function computeTodayRoutineItems(
  routines: Routine[],
  routineOccurrences: RoutineOccurrence[]
): TodayRoutineItem[] {
  const today = todayLocalISODate();
  const lookback = new Date();
  lookback.setDate(lookback.getDate() - LOOKBACK_DAYS);
  const backStart = toLocalISO(lookback);
  const items: TodayRoutineItem[] = [];
  for (const r of routines) {
    if (r.archived) continue;
    const done = completedDatesFor(routineOccurrences, r.id);
    const dates = computeDueDates(r, backStart, today);
    for (const d of dates) {
      if (!done.has(d)) items.push({ routine: r, scheduledDate: d });
    }
  }
  items.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  return items;
}

/** Separa los items en atrasados (fecha < hoy) vs. del día + total. */
export function routineCounts(items: TodayRoutineItem[]): {
  overdue: number;
  dueToday: number;
  total: number;
} {
  const today = todayLocalISODate();
  const overdue = items.filter((it) => it.scheduledDate < today).length;
  const dueToday = items.filter((it) => it.scheduledDate === today).length;
  return { overdue, dueToday, total: overdue + dueToday };
}

/** Suma de horas de esfuerzo de las rutinas pendientes hoy, redondeada a 1 decimal. */
export function routineEffortHours(items: TodayRoutineItem[]): number {
  const sum = items.reduce((acc, it) => acc + (it.routine.effortHours ?? 0), 0);
  return Math.round(sum * 10) / 10;
}
