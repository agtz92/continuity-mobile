export const daysSince = (dateStr?: string | null) => {
  if (!dateStr) return null;
  return Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
};

/** Whole days from now until `dateStr`. Negative if already past. */
export const daysUntil = (dateStr?: string | null) => {
  if (!dateStr) return null;
  return Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
};

export const hoursSince = (dateStr?: string | null) => {
  if (!dateStr) return null;
  return Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60)
  );
};

export const toLocalISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const todayLocalISODate = () => toLocalISO(new Date());

export const dueDateOnly = (dateStr: string) => dateStr.slice(0, 10);

export const isDueToday = (dateStr?: string | null) => {
  if (!dateStr) return false;
  return dueDateOnly(dateStr) === todayLocalISODate();
};

export const isOverdue = (dateStr?: string | null) => {
  if (!dateStr) return false;
  return dueDateOnly(dateStr) < todayLocalISODate();
};

export const daysOverdue = (dateStr?: string | null): number | null => {
  if (!dateStr) return null;
  const due = new Date(dueDateOnly(dateStr) + "T00:00:00");
  const today = new Date(todayLocalISODate() + "T00:00:00");
  const diff = Math.floor(
    (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diff > 0 ? diff : null;
};

export const isCompletedToday = (dateStr?: string | null) => {
  if (!dateStr) return false;
  return toLocalISO(new Date(dateStr)) === todayLocalISODate();
};

/** Monday-anchored start of the ISO week as a local YYYY-MM-DD. */
export const weekStartISO = (ref: Date = new Date()) => {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const offset = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - offset);
  return toLocalISO(d);
};

/**
 * Given a list of activity timestamps (ISO strings), returns:
 * - current: consecutive days ending today (or 0 if today has no activity)
 * - best: longest historical run of consecutive active days
 */
export const computeStreak = (
  isoTimestamps: Array<string | null | undefined>
): { current: number; best: number } => {
  const days = new Set<string>();
  for (const ts of isoTimestamps) {
    if (!ts) continue;
    days.add(toLocalISO(new Date(ts)));
  }
  if (days.size === 0) return { current: 0, best: 0 };

  // Current streak: walk backwards from today.
  let current = 0;
  const cursor = new Date();
  while (days.has(toLocalISO(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Best streak: scan sorted days.
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prevTime: number | null = null;
  for (const iso of sorted) {
    const t = new Date(iso + "T00:00:00").getTime();
    if (prevTime !== null && t - prevTime === 86_400_000) {
      run += 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prevTime = t;
  }
  return { current, best };
};

/** Count distinct days with activity within the current week (Mon..today). */
export const daysActiveThisWeek = (
  isoTimestamps: Array<string | null | undefined>
): number => {
  const start = weekStartISO();
  const today = todayLocalISODate();
  const days = new Set<string>();
  for (const ts of isoTimestamps) {
    if (!ts) continue;
    const iso = toLocalISO(new Date(ts));
    if (iso >= start && iso <= today) days.add(iso);
  }
  return days.size;
};
