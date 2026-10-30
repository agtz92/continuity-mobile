import type { TFunction } from "i18next";

import { OVERLOAD_HOURS, type CalendarView } from "@/lib/calendar";
import { formatHours } from "./summary";

/** Titular del periodo: "Thu, Oct 29", "Oct 26 – Nov 1" u "October 2026". */
export function periodLabel(view: CalendarView, refDate: Date, days: string[], locale: string): string {
  if (view === "day") {
    return refDate.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  }
  if (view === "week") {
    const fmt = (iso: string) =>
      new Date(iso + "T00:00:00").toLocaleDateString(locale, { day: "numeric", month: "short" });
    return `${fmt(days[0])} – ${fmt(days[6])}`;
  }
  const s = refDate.toLocaleDateString(locale, { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "5 items · ≈ 7½h of 8h" (Día) o "5 items · ≈ 7½h" (agenda del Mes). */
export function itemsMeta(t: TFunction, n: number, hours: number, withCap: boolean): string {
  const h =
    hours > 0
      ? withCap
        ? t("views.calendar.hoursOfCap", { hours: formatHours(hours), cap: `${OVERLOAD_HOURS}h` })
        : `≈ ${formatHours(hours)}`
      : null;
  return [t("views.calendar.itemsCount", { count: n }), h].filter(Boolean).join(" · ");
}
