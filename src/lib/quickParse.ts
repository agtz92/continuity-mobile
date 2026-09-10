import type { Project } from "@/lib/types";
import { parseDateWords } from "./quickDate";

/**
 * El parser de la captura rápida.
 *
 * **Espejo exacto de `continuity/frontend/src/lib/quickParse.ts`.** Los dos
 * archivos tienen que decir lo mismo: si divergen, la misma línea escrita en el
 * móvil y en la web crea cosas distintas. Los tests viven en la web, que es
 * donde hay corredor de tests; cualquier cambio se hace allí y se copia aquí.
 *
 * La idea del diseño es escribir una línea y que salga bien puesta, sin tocar
 * el ratón:
 *
 *     Llamar al notario #impuestos @jue 9:30 ~30m !falta el poder
 *     → título "Llamar al notario", proyecto Impuestos, jueves a las 9:30,
 *       media hora de bloque, y un blocker con su razón
 *
 * ## Una sola regla para los cinco sigilos
 *
 * **Un sigilo solo cuenta al principio de una palabra, y se escapa
 * duplicándolo.** Antes cada uno tenía su propia excepción y `!` se llevaba
 * todo lo que hubiera a su derecha desde el primer carácter que apareciera:
 * "Avisar a Ana ya!" se guardaba como "Avisar a Ana ya" con un bloqueo vacío, y
 * en español, donde media frase acaba en admiración, eso pasaba todo el rato.
 * Perder texto en silencio es el peor fallo que puede tener una captura.
 *
 * Con la regla nueva, `ya!` es texto (el `!` no abre palabra),
 * `precio@proveedor.com` es texto, y `##web` escribe un `#web` literal.
 *
 * | Token            | Hace                       | Va a                          |
 * |------------------|----------------------------|-------------------------------|
 * | `#proyecto`      | elige proyecto             | `projectId`                   |
 * | `@fecha [hora]`  | ver `quickDate.ts`         | `dueDate` + `dueTime`         |
 * | `~30m` `~2h`     | duración del bloque        | `durationMinutes`             |
 * | `!razón`         | bloqueo (solo tareas)      | `TaskBlocker`                 |
 * | `/tarea` `/idea` | tipo, sin depender de TAB  | `kind`                        |
 *
 * ## Lo que no resuelve se queda a la vista
 *
 * Un `#algo` que no encuentra proyecto, un `@loquesea` que no es fecha o un
 * `~xx` que no es duración **se quedan literales en el título** y salen
 * listados en `unresolved`. Tragarse un token que no hizo nada dejaría al
 * usuario sin saber que falló.
 *
 * Y `#` ya no adivina: si el texto casa con dos proyectos, no elige ninguno y
 * devuelve los candidatos en `projectCandidates` para que la interfaz pregunte.
 * Antes desempataba por "el nombre más corto", que es una forma elegante de
 * colgar la tarea del proyecto equivocado sin decírselo a nadie.
 */

export const CAPTURE_KINDS = ["task", "idea", "note", "update"] as const;
export type CaptureKind = (typeof CAPTURE_KINDS)[number];

/** `/tarea` y `/task` son lo mismo: el parser no mira el locale activo. */
const KIND_WORDS: Record<string, CaptureKind> = {
  tarea: "task",
  task: "task",
  idea: "idea",
  nota: "note",
  note: "note",
  update: "update",
  bitacora: "update",
};

export const SIGILS = ["#", "@", "~", "!", "/"] as const;
export type Sigil = (typeof SIGILS)[number];

export interface QuickParsed {
  title: string;
  /** `null` cuando el texto no trae `/tipo`: manda el tipo elegido en la interfaz. */
  kind: CaptureKind | null;
  projectId: string | null;
  /** El proyecto resuelto, para poder enseñarlo mientras se escribe. */
  project: Project | null;
  /** Candidatos cuando `#algo` casó con más de uno. La interfaz pregunta. */
  projectCandidates: Project[];
  /** `YYYY-MM-DD` local. */
  dueDate: string | null;
  /** `HH:MM`. Puede venir sin fecha: la interfaz lo lee como hoy. */
  dueTime: string | null;
  durationMinutes: number | null;
  /** `true` en cuanto aparece un `!`, aunque no lleve razón detrás. */
  blocked: boolean;
  blockerReason: string;
  /** Tokens con sigilo que no resolvieron y se quedaron en el título. */
  unresolved: string[];
}

/** Minúsculas y sin acentos, para comparar lo que el usuario teclea. */
export function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

interface Word {
  text: string;
  start: number;
  end: number;
}

/** Palabras con su posición en el texto original. */
function scanWords(raw: string): Word[] {
  const out: Word[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    out.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

export interface ProjectMatch {
  project: Project | null;
  /** Más de uno casó: nadie elige por el usuario. */
  candidates: Project[];
}

/**
 * Busca proyecto por nombre: exacto → prefijo → contenido, y en cada escalón
 * **solo vale si es único**. Un empate no se resuelve por longitud ni por orden
 * de llegada; se devuelve como empate.
 */
export function matchProject(token: string, projects: Project[]): ProjectMatch {
  const needle = fold(token);
  if (!needle) return { project: null, candidates: [] };

  const exact = projects.filter((p) => fold(p.name) === needle);
  if (exact.length === 1) return { project: exact[0], candidates: exact };
  if (exact.length > 1) return { project: null, candidates: exact };

  const prefixed = projects.filter((p) => fold(p.name).startsWith(needle));
  if (prefixed.length === 1) return { project: prefixed[0], candidates: prefixed };
  if (prefixed.length > 1) return { project: null, candidates: prefixed };

  const contained = projects.filter((p) => fold(p.name).includes(needle));
  if (contained.length === 1) return { project: contained[0], candidates: contained };
  return { project: null, candidates: contained };
}

/** Los proyectos que ofrecería el autocompletado para lo tecleado hasta ahora. */
export function projectSuggestions(
  token: string,
  projects: Project[],
  limit = 6
): Project[] {
  const needle = fold(token);
  const score = (p: Project): number => {
    const name = fold(p.name);
    if (name === needle) return 0;
    if (name.startsWith(needle)) return 1;
    if (name.includes(needle)) return 2;
    return 3;
  };
  return projects
    .map((p) => ({ p, s: score(p) }))
    .filter((x) => needle === "" || x.s < 3)
    .sort((a, b) => a.s - b.s || a.p.name.localeCompare(b.p.name))
    .slice(0, limit)
    .map((x) => x.p);
}

/**
 * El token `#` que se escribe en un nombre con espacios va entre comillas.
 * Sin esto, "Web · rediseño" sería inalcanzable desde la captura: el token
 * termina en el primer espacio y solo se llegaba por prefijo.
 */
export function projectToken(name: string): string {
  return /\s/.test(name) ? `#"${name}"` : `#${name}`;
}

/** `~45m` · `~90min` · `~2h` · `~1.5h` · `~1h30`. Devuelve minutos. */
function parseDuration(body: string): number | null {
  const s = fold(body).replace(",", ".");

  const compound = s.match(/^(\d{1,2})h(\d{1,2})$/);
  if (compound) {
    const min = Number(compound[1]) * 60 + Number(compound[2]);
    return min > 0 && min <= 24 * 60 ? min : null;
  }

  const m = s.match(/^(\d{1,4}(?:\.\d{1,2})?)(h|hs|hr|hrs|m|min|mins)$/);
  if (!m) return null;

  const value = Number(m[1]);
  const minutes = /^h/.test(m[2]) ? Math.round(value * 60) : Math.round(value);
  return minutes > 0 && minutes <= 24 * 60 ? minutes : null;
}

/**
 * Un sigilo duplicado es el propio carácter, literal. Devuelve el texto ya sin
 * el escape para que el título salga como se lee.
 */
function unescapeWord(text: string): string | null {
  const c = text[0];
  if (!c || !(SIGILS as readonly string[]).includes(c)) return null;
  return text[1] === c ? text.slice(1) : null;
}

export function quickParse(raw: string, projects: Project[]): QuickParsed {
  const words = scanWords(raw);
  const keep: string[] = [];
  const unresolved: string[] = [];

  let kind: CaptureKind | null = null;
  let project: Project | null = null;
  let projectCandidates: Project[] = [];
  let dueDate: string | null = null;
  let dueTime: string | null = null;
  let durationMinutes: number | null = null;
  let blocked = false;
  let blockerReason = "";

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const text = word.text;
    const sigil = text[0] as Sigil | undefined;

    const escaped = unescapeWord(text);
    if (escaped !== null) {
      keep.push(escaped);
      continue;
    }

    // `!` corta: todo lo que queda a su derecha es la razón, sin volver a
    // parsear. "espera a #web" es una frase, no un proyecto.
    if (sigil === "!") {
      blocked = true;
      blockerReason = raw.slice(word.start + 1).trim();
      break;
    }

    if (sigil === "#" && !project && projectCandidates.length === 0) {
      // Nombre entre comillas: puede llevar espacios y se cierra donde diga.
      let token = text.slice(1);
      let consumed = 0;
      if (token.startsWith('"')) {
        const closing = raw.indexOf('"', word.start + 2);
        if (closing !== -1) {
          token = raw.slice(word.start + 2, closing);
          while (
            consumed + i + 1 < words.length &&
            words[i + consumed + 1].start < closing
          ) {
            consumed++;
          }
        } else {
          token = token.slice(1);
        }
      }
      const hit = matchProject(token, projects);
      if (hit.project) {
        project = hit.project;
        i += consumed;
        continue;
      }
      if (hit.candidates.length > 1) {
        projectCandidates = hit.candidates;
        i += consumed;
        continue;
      }
      unresolved.push(text);
      keep.push(text);
      continue;
    }

    if (sigil === "@" && !dueDate && !dueTime) {
      const rest = [text.slice(1), ...words.slice(i + 1).map((w) => w.text)];
      const hit = parseDateWords(rest.filter((w) => w !== ""));
      // La palabra del sigilo cuenta salvo que `@` fuera a solas ("@ mañana").
      const offset = text.length > 1 ? 1 : 0;
      if (hit && hit.words >= offset) {
        dueDate = hit.date;
        dueTime = hit.time;
        i += hit.words - offset;
        continue;
      }
      unresolved.push(text);
      keep.push(text);
      continue;
    }

    if (sigil === "~" && durationMinutes === null) {
      const minutes = parseDuration(text.slice(1));
      if (minutes !== null) {
        durationMinutes = minutes;
        continue;
      }
      unresolved.push(text);
      keep.push(text);
      continue;
    }

    if (sigil === "/" && !kind) {
      const found = KIND_WORDS[fold(text.slice(1))];
      if (found) {
        kind = found;
        continue;
      }
      unresolved.push(text);
      keep.push(text);
      continue;
    }

    keep.push(text);
  }

  return {
    title: keep.join(" ").replace(/\s+/g, " ").trim(),
    kind,
    projectId: project?.id ?? null,
    project,
    projectCandidates,
    dueDate,
    dueTime,
    durationMinutes,
    blocked,
    blockerReason,
    unresolved,
  };
}

export interface ActiveToken {
  sigil: Sigil;
  /** Lo tecleado tras el sigilo, sin comillas. */
  query: string;
  start: number;
  end: number;
}

/**
 * El token sobre el que está el cursor, para el autocompletado. Solo cuenta si
 * el cursor está dentro de la palabra: si ya pasaste a la siguiente, la lista
 * de sugerencias estorba.
 */
export function activeToken(raw: string, caret: number): ActiveToken | null {
  for (const word of scanWords(raw)) {
    if (caret < word.start || caret > word.end) continue;
    const sigil = word.text[0] as Sigil | undefined;
    if (!sigil || !(SIGILS as readonly string[]).includes(sigil)) return null;
    if (word.text[1] === sigil) return null; // escapado
    return {
      sigil,
      query: word.text.slice(1).replace(/^"/, ""),
      start: word.start,
      end: word.end,
    };
  }
  return null;
}

/** Cambia el token bajo el cursor por otro, y deja el cursor tras él. */
export function replaceToken(
  raw: string,
  token: { start: number; end: number },
  replacement: string
): { text: string; caret: number } {
  const before = raw.slice(0, token.start);
  const after = raw.slice(token.end);
  const text = `${before}${replacement}${after.startsWith(" ") ? "" : " "}${after}`;
  return { text, caret: before.length + replacement.length + 1 };
}

/**
 * Escapa los sigilos que abren palabra, para que un texto que viene de fuera
 * (del modelo, de un portapapeles) no se reinterprete al volver al campo.
 * "¡Hazlo ya! #urgente" tiene que seguir siendo ese texto, no un bloqueo.
 */
export function escapeSigils(text: string): string {
  return text.replace(/(^|\s)([#@~!/])/g, (_m, space: string, sigil: string) =>
    `${space}${sigil}${sigil}`
  );
}

export interface CaptureLineParts {
  title: string;
  project?: Project | null;
  /** `YYYY-MM-DD`. */
  dueDate?: string | null;
  /** `HH:MM`. */
  dueTime?: string | null;
  durationMinutes?: number | null;
  blocker?: string | null;
}

/**
 * Los campos, de vuelta a una línea con la sintaxis de la captura.
 *
 * Es lo que hace legible la interpretación con IA: en vez de rellenar campos
 * invisibles, el modelo **reescribe la línea** y el usuario ve exactamente qué
 * entendió, en el mismo idioma de tokens que puede editar a mano. Volver a
 * parsear esa línea es lo que se guarda, así que no hay dos fuentes de verdad.
 */
export function composeCaptureLine(parts: CaptureLineParts): string {
  const chunks = [escapeSigils(parts.title.trim())];

  if (parts.project) chunks.push(projectToken(parts.project.name));
  if (parts.dueDate) {
    chunks.push(`@${parts.dueDate}${parts.dueTime ? ` ${parts.dueTime}` : ""}`);
  } else if (parts.dueTime) {
    chunks.push(`@${parts.dueTime}`);
  }
  if (parts.durationMinutes) chunks.push(`~${parts.durationMinutes}m`);
  // El bloqueo va al final porque se lleva todo lo que tenga a su derecha.
  if (parts.blocker?.trim()) chunks.push(`!${parts.blocker.trim()}`);

  return chunks.filter(Boolean).join(" ");
}
