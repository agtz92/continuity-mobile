/**
 * El parser de fechas de la captura rápida: lo que va detrás de `@`.
 *
 * **Espejo exacto de `continuity/frontend/src/lib/quickDate.ts`** (ver la nota
 * de paridad en `quickParse.ts`).
 *
 *     Llamar al notario @jue 9:30
 *     Pagar el IVA @15/03
 *     Revisar el contrato @mañana
 *
 * **Por qué existe.** `TaskInput` acepta `dueDate`, `dueTime` y
 * `durationMinutes` desde siempre, pero la captura mandaba los tres en `null`:
 * capturabas una tarea y tenías que abrirla igual para ponerle fecha, que era
 * justo el paso que la captura venía a ahorrar.
 *
 * **Entiende español e inglés a la vez**, sin mirar el locale activo. Un parser
 * que solo acepta el idioma de la interfaz falla justo cuando el usuario
 * escribe como piensa, y equivocarse aquí no es un error visible: es una tarea
 * con la fecha de otro día.
 *
 * **Nunca adivina.** Si la frase no encaja en la gramática de abajo devuelve
 * `null`, el token se queda literal en el título y el usuario ve que su `@` no
 * hizo nada. Es la misma regla que ya seguía `#`.
 *
 * Gramática (fecha opcional + hora opcional, en ese orden):
 *
 * | Frase            | Ejemplos                              |
 * |------------------|---------------------------------------|
 * | relativa         | `hoy` `mañana` `pasado mañana` `ayer` |
 * | día de la semana | `jue` `jueves` `thu` `próximo jueves` |
 * | desplazamiento   | `+3d` `+2s` `+1m` `en 3 días`         |
 * | numérica         | `15/3` `15/3/2026` `2026-03-15`       |
 * | día y mes        | `15 mar` `15 de marzo` `mar 15`       |
 * | hora             | `9:30` `9pm` `21h` `a las 9`          |
 */

import { toLocalISO } from "./date";

export interface DateHit {
  /** `YYYY-MM-DD` local, o `null` si solo se dijo una hora. */
  date: string | null;
  /** `HH:MM`, o `null` si no se dijo hora. */
  time: string | null;
  /** Palabras consumidas. El llamador las quita del título. */
  words: number;
}

/** Minúsculas, sin acentos y sin la puntuación que arrastra el final. */
function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[.,;:]+$/, "");
}

/** 0 = domingo, como `Date.getDay()`. */
const WEEKDAYS: Record<string, number> = {
  domingo: 0, dom: 0, sunday: 0, sun: 0,
  lunes: 1, lun: 1, monday: 1, mon: 1,
  martes: 2, mar: 2, tuesday: 2, tue: 2, tues: 2,
  miercoles: 3, mie: 3, mier: 3, wednesday: 3, wed: 3,
  jueves: 4, jue: 4, thursday: 4, thu: 4, thur: 4, thurs: 4,
  viernes: 5, vie: 5, friday: 5, fri: 5,
  sabado: 6, sab: 6, saturday: 6, sat: 6,
};

const MONTHS: Record<string, number> = {
  enero: 1, ene: 1, january: 1, jan: 1,
  febrero: 2, feb: 2, february: 2,
  marzo: 3, mar: 3, march: 3,
  abril: 4, abr: 4, april: 4, apr: 4,
  mayo: 5, may: 5,
  junio: 6, jun: 6, june: 6,
  julio: 7, jul: 7, july: 7,
  agosto: 8, ago: 8, august: 8, aug: 8,
  septiembre: 9, sep: 9, sept: 9, september: 9, setiembre: 9,
  octubre: 10, oct: 10, october: 10,
  noviembre: 11, nov: 11, november: 11,
  diciembre: 12, dic: 12, december: 12, dec: 12,
};

/**
 * `mar` es martes y marzo a la vez, y `may` es mayo. La ambigüedad se resuelve
 * por posición: cuentan como mes solo cuando llevan un número al lado
 * (`15 mar` es marzo; `mar` suelto es martes).
 */
const AMBIGUOUS = new Set(["mar", "may"]);

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const addDays = (d: Date, n: number) => {
  const out = startOfDay(d);
  out.setDate(out.getDate() + n);
  return out;
};

const addMonths = (d: Date, n: number) => {
  const out = startOfDay(d);
  out.setMonth(out.getMonth() + n);
  return out;
};

/** El día de la semana más próximo, contando hoy. `strict` salta a la semana siguiente. */
function nextWeekday(now: Date, weekday: number, strict: boolean): Date {
  const today = startOfDay(now);
  let delta = (weekday - today.getDay() + 7) % 7;
  if (strict && delta === 0) delta = 7;
  return addDays(today, delta);
}

/**
 * Un año de dos cifras es de este siglo. `15/3/26` es 2026, no 1926: la
 * captura rápida mira hacia adelante, nunca hacia el pasado remoto.
 */
function normalizeYear(y: number, now: Date): number {
  if (y >= 100) return y;
  return Math.floor(now.getFullYear() / 100) * 100 + y;
}

/**
 * Día y mes sin año: el año es el que hace que la fecha **no quede en el
 * pasado**. Escribir `@15/1` un 20 de diciembre significa el enero que viene,
 * no el que pasó hace once meses.
 */
function resolveYearless(day: number, month: number, now: Date): Date | null {
  const thisYear = new Date(now.getFullYear(), month - 1, day);
  if (thisYear.getMonth() !== month - 1) return null; // 31 de febrero
  return thisYear < startOfDay(now)
    ? new Date(now.getFullYear() + 1, month - 1, day)
    : thisYear;
}

/** Solo la parte de fecha. Devuelve la fecha y cuántas palabras se llevó. */
function parseDatePhrase(
  words: string[],
  now: Date
): { date: Date; words: number } | null {
  const w0 = fold(words[0] ?? "");
  if (!w0) return null;
  const w1 = fold(words[1] ?? "");
  const w2 = fold(words[2] ?? "");

  // hoy · mañana · pasado mañana · ayer
  if (w0 === "hoy" || w0 === "today") return { date: startOfDay(now), words: 1 };
  if (w0 === "manana" || w0 === "tomorrow") {
    return { date: addDays(now, 1), words: 1 };
  }
  if (w0 === "ayer" || w0 === "yesterday") {
    return { date: addDays(now, -1), words: 1 };
  }
  if (w0 === "pasado") {
    return { date: addDays(now, 2), words: w1 === "manana" ? 2 : 1 };
  }

  // ISO completo: 2026-03-15
  const iso = w0.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    const date = new Date(y, m - 1, d);
    return date.getMonth() === m - 1 ? { date, words: 1 } : null;
  }

  // Numérica: 15/3 · 15/3/2026 · 15-3
  const num = w0.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (num) {
    const day = Number(num[1]);
    const month = Number(num[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    if (num[3]) {
      const date = new Date(normalizeYear(Number(num[3]), now), month - 1, day);
      return date.getMonth() === month - 1 ? { date, words: 1 } : null;
    }
    const date = resolveYearless(day, month, now);
    return date ? { date, words: 1 } : null;
  }

  // Desplazamiento: +3d · +2s · +2w · +1m
  const shift = w0.match(/^\+(\d{1,3})([dsmw])$/);
  if (shift) {
    const n = Number(shift[1]);
    const unit = shift[2];
    if (unit === "d") return { date: addDays(now, n), words: 1 };
    if (unit === "s" || unit === "w") {
      return { date: addDays(now, n * 7), words: 1 };
    }
    return { date: addMonths(now, n), words: 1 };
  }

  // en 3 días · in 2 weeks
  if ((w0 === "en" || w0 === "in") && /^\d{1,3}$/.test(w1)) {
    const n = Number(w1);
    if (/^(dias?|days?)$/.test(w2)) return { date: addDays(now, n), words: 3 };
    if (/^(semanas?|weeks?)$/.test(w2)) {
      return { date: addDays(now, n * 7), words: 3 };
    }
    if (/^(meses|mes|months?)$/.test(w2)) {
      return { date: addMonths(now, n), words: 3 };
    }
  }

  // próximo jueves · next thursday
  if (/^(proximo|proxima|next)$/.test(w0) && w1 in WEEKDAYS) {
    return { date: nextWeekday(now, WEEKDAYS[w1], true), words: 2 };
  }

  // 15 mar · 15 de marzo · 15 march
  if (/^\d{1,2}$/.test(w0)) {
    const monthWord = w1 === "de" ? w2 : w1;
    const consumed = w1 === "de" ? 3 : 2;
    if (monthWord in MONTHS) {
      const date = resolveYearless(Number(w0), MONTHS[monthWord], now);
      if (date) return { date, words: consumed };
    }
    return null;
  }

  // mar 15 · march 15
  if (w0 in MONTHS && /^\d{1,2}$/.test(w1)) {
    const date = resolveYearless(Number(w1), MONTHS[w0], now);
    if (date) return { date, words: 2 };
  }

  // Día de la semana suelto. `mar`/`may` solo llegan aquí si no eran mes.
  if (w0 in WEEKDAYS && !(AMBIGUOUS.has(w0) && /^\d{1,2}$/.test(w1))) {
    return { date: nextWeekday(now, WEEKDAYS[w0], false), words: 1 };
  }

  return null;
}

/** Solo la parte de hora. `a las 9` / `at 9` se comen su preposición. */
function parseTimePhrase(
  words: string[]
): { time: string; words: number } | null {
  let i = 0;
  let prefix = 0;

  // "a las 9" · "a la 1" · "at 9"
  if (fold(words[0] ?? "") === "a" && /^(las|la)$/.test(fold(words[1] ?? ""))) {
    i = 2;
    prefix = 2;
  } else if (fold(words[0] ?? "") === "at") {
    i = 1;
    prefix = 1;
  }

  const raw = fold(words[i] ?? "");
  if (!raw) return null;

  // 9:30 · 09:30 · 9:30pm · 9pm · 21h
  const m = raw.match(/^(\d{1,2})(?::(\d{2}))?(am|pm|h)?$/);
  if (!m) return null;

  let suffix = m[3] ?? "";
  let extra = 0;

  // `am`/`pm` separados por un espacio ("9 pm") siguen siendo la misma hora.
  if (!suffix) {
    const next = fold(words[i + 1] ?? "");
    if (next === "am" || next === "pm") {
      suffix = next;
      extra = 1;
    }
  }

  // Un número pelado solo es hora si algo lo marca: dos puntos, am/pm, `h`, o
  // la preposición. Si no, `@15 mar` se leería como las 15:00 de un mes suelto.
  if (!suffix && !m[2] && !prefix) return null;

  let hour = Number(m[1]);
  const minute = m[2] ? Number(m[2]) : 0;
  if (minute > 59) return null;
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  if (hour > 23) return null;

  return {
    time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    words: prefix + 1 + extra,
  };
}

/**
 * Fecha, hora o las dos, a partir de las palabras que siguen a `@`.
 * `null` cuando nada encaja: el token se queda literal y se ve que no hizo nada.
 *
 * `now` se inyecta para los tests; en producción es la hora del navegador, que
 * es la zona en la que el usuario piensa cuando escribe "mañana".
 */
export function parseDateWords(
  words: string[],
  now: Date = new Date()
): DateHit | null {
  const date = parseDatePhrase(words, now);
  const rest = date ? words.slice(date.words) : words;
  const time = parseTimePhrase(rest);

  if (!date && !time) return null;

  return {
    date: date ? toLocalISO(date.date) : null,
    time: time ? time.time : null,
    words: (date?.words ?? 0) + (time?.words ?? 0),
  };
}
