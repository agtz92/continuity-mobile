import type {
  IntervalUnit,
  RecurrenceType,
  Routine,
  RoutineOccurrence,
} from "./types";
import { todayLocalISODate, toLocalISO } from "./date";

const dateFromISO = (iso: string): Date => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

const addDays = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const lastDayOfMonth = (year: number, month: number /* 0-11 */): number =>
  new Date(year, month + 1, 0).getDate();

const clampMonthDay = (year: number, month: number, day: number): Date => {
  const last = lastDayOfMonth(year, month);
  return new Date(year, month, Math.min(day, last));
};

const addMonths = (d: Date, months: number): Date => {
  const total = d.getMonth() + months;
  const year = d.getFullYear() + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  return clampMonthDay(year, month, d.getDate());
};

/** weekday: 0=Mon..6=Sun (matches Python's `date.weekday()`). */
const jsDayToMondayIndex = (jsDay: number): number =>
  jsDay === 0 ? 6 : jsDay - 1;

export function computeDueDates(
  routine: Routine,
  fromISO: string,
  toISO: string
): string[] {
  if (fromISO > toISO) return [];
  const start = dateFromISO(routine.startDate);
  const end = routine.endDate ? dateFromISO(routine.endDate) : null;
  const rngStart = dateFromISO(fromISO < routine.startDate ? routine.startDate : fromISO);
  const rngEnd = end && toLocalISO(end) < toISO ? end : dateFromISO(toISO);
  if (rngStart > rngEnd) return [];

  const out: string[] = [];

  if (routine.recurrenceType === "once") {
    if (
      routine.startDate >= fromISO &&
      routine.startDate <= toISO
    ) {
      out.push(routine.startDate);
    }
    return out;
  }

  if (routine.recurrenceType === "weekly_days") {
    const wanted = new Set(routine.weekdays);
    if (wanted.size === 0) return [];
    let cur = new Date(rngStart);
    while (cur <= rngEnd) {
      if (wanted.has(jsDayToMondayIndex(cur.getDay()))) {
        out.push(toLocalISO(cur));
      }
      cur = addDays(cur, 1);
    }
    return out;
  }

  if (routine.recurrenceType === "every_n") {
    const n = Math.max(1, routine.intervalN ?? 1);
    const unit: IntervalUnit | null = routine.intervalUnit;
    let cur = new Date(start);
    while (cur <= rngEnd) {
      if (cur >= rngStart) out.push(toLocalISO(cur));
      if (unit === "days") cur = addDays(cur, n);
      else if (unit === "weeks") cur = addDays(cur, n * 7);
      else if (unit === "months") cur = addMonths(cur, n);
      else break;
    }
    return out;
  }

  if (routine.recurrenceType === "monthly_day") {
    const day = Math.max(1, Math.min(31, routine.monthlyDay ?? start.getDate()));
    let y = start.getFullYear();
    let m = start.getMonth();
    const endY = rngEnd.getFullYear();
    const endM = rngEnd.getMonth();
    while (y < endY || (y === endY && m <= endM)) {
      const candidate = clampMonthDay(y, m, day);
      if (
        candidate >= start &&
        candidate >= rngStart &&
        candidate <= rngEnd
      ) {
        out.push(toLocalISO(candidate));
      }
      m += 1;
      if (m === 12) {
        y += 1;
        m = 0;
      }
    }
    return out;
  }

  return out;
}

export function nextDueDate(
  routine: Routine,
  completedDates: Set<string>,
  horizonDays: number = 90
): string | null {
  if (routine.archived) return null;
  const today = todayLocalISODate();
  const horizon = addDays(new Date(), horizonDays);
  const dates = computeDueDates(routine, today, toLocalISO(horizon));
  for (const d of dates) {
    if (!completedDates.has(d)) return d;
  }
  return null;
}

export function lastCompletedDate(
  occurrences: RoutineOccurrence[],
  routineId: string
): string | null {
  const filtered = occurrences
    .filter((o) => o.routineId === routineId)
    .map((o) => o.scheduledDate)
    .sort();
  return filtered.length ? filtered[filtered.length - 1] : null;
}

export function completedDatesFor(
  occurrences: RoutineOccurrence[],
  routineId: string
): Set<string> {
  const out = new Set<string>();
  for (const o of occurrences) {
    if (o.routineId === routineId) out.add(o.scheduledDate);
  }
  return out;
}

/**
 * Build the 7 short weekday labels (Monday-first) from a `recurrence.weekday.short`
 * translator. Pass the namespaced `t` from `useTranslations("recurrence.weekday.short")`.
 */
export function weekdayShortLabels(
  t: (key: string) => string
): string[] {
  return [
    t("0"),
    t("1"),
    t("2"),
    t("3"),
    t("4"),
    t("5"),
    t("6"),
  ];
}

/**
 * Produce a localized human-readable label for the recurrence rule.
 * `t` must be namespaced to `recurrence`.
 */
export function describeRecurrence(
  routine: Routine,
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  const rt: RecurrenceType = routine.recurrenceType;
  if (rt === "once") {
    return t("once", { date: routine.startDate });
  }
  if (rt === "weekly_days") {
    const labels = [
      t("weekday.short.0"),
      t("weekday.short.1"),
      t("weekday.short.2"),
      t("weekday.short.3"),
      t("weekday.short.4"),
      t("weekday.short.5"),
      t("weekday.short.6"),
    ];
    const picked = routine.weekdays
      .slice()
      .sort((a, b) => a - b)
      .map((d) => labels[d])
      .join(" · ");
    return picked || t("weeklyEmpty");
  }
  if (rt === "every_n") {
    const n = routine.intervalN ?? 1;
    const unit = routine.intervalUnit ?? "days";
    return t(`everyN.${unit}`, { n });
  }
  if (rt === "monthly_day") {
    return t("monthlyDay", { day: routine.monthlyDay ?? 1 });
  }
  return "";
}
