// COPIA VERBATIM de `frontend/src/components/markdown/parse.ts`.
//
// El parser no tiene ni un import: se separó del renderizador precisamente para
// que las dos plataformas compartan la gramática sin compartir el DOM. Los
// tests que lo fijan viven en web (`parse.test.ts`, 16 casos); este repo no
// tiene runner, así que **si tocas la gramática, tócala allá y vuelve a copiar**
// — no la edites aquí.

/**
 * Parser de markdown propio, sin dependencias.
 *
 * Es la extensión del que ya servía a Quick Notes (`notes/MarkdownText.tsx`,
 * 116 líneas): mismo subconjunto deliberado más **tablas GFM** y una noción de
 * bloque incompleto para el chat en streaming.
 *
 * Se extendió en vez de traer `react-markdown` + `remark-gfm` (~40 KB gzip), y
 * el peso no fue la razón principal: el chat necesita convertir
 * `[Nombre](task:uuid)` en un chip, elegir entre dos renderizados de tabla
 * contando columnas, y saber si el último bloque cerró. Con la librería habría
 * que escribir las tres cosas igual, como plugins.
 *
 * El parser es **puro y separado del render** para poder probarlo sin montar
 * React: es donde viven todos los casos borde.
 */

export type Align = "left" | "right" | "center";

export interface ParagraphBlock {
  kind: "paragraph";
  text: string;
}

export interface HeadingBlock {
  kind: "heading";
  level: 1 | 2 | 3;
  text: string;
}

export interface ListBlock {
  kind: "list";
  ordered: boolean;
  items: string[];
}

export interface TableBlock {
  kind: "table";
  header: string[];
  align: Align[];
  rows: string[][];
  /** La última fila es un total si su primera celda lo dice. */
  hasTotalRow: boolean;
}

/**
 * Un bloque que el stream dejó a medias. Se pinta como texto tenue y **solo se
 * convierte en tabla cuando cierra**: una tabla que crece columna a columna
 * reflowea el panel tres veces por segundo.
 */
export interface IncompleteBlock {
  kind: "incomplete";
  text: string;
}

export type Block =
  | ParagraphBlock
  | HeadingBlock
  | ListBlock
  | TableBlock
  | IncompleteBlock;

const HEADING = /^(#{1,3})\s+(.*)$/;
const UL = /^[-*]\s+(.*)$/;
const OL = /^\d+\.\s+(.*)$/;

/**
 * Fila de tabla: contiene una tubería. GFM permite omitir los bordes
 * exteriores (`a | b` es tabla válida), así que exigir que empiece por `|`
 * dejaba fuera tablas legítimas — y una tabla no reconocida se imprime como la
 * escalera de tuberías que motivó todo este trabajo.
 *
 * Lo que evita los falsos positivos no es esta función: es que **hace falta la
 * fila separadora** justo debajo para abrir una tabla.
 */
function isTableRow(line: string): boolean {
  return line.includes("|") && line.trim().length > 1;
}

/** La fila separadora: `|---|:--:|---:|`. Es lo que hace tabla a una tabla. */
function isDelimiterRow(line: string): boolean {
  const cells = splitRow(line);
  return (
    cells.length > 0 && cells.every((c) => /^:?-{1,}:?$/.test(c.trim()))
  );
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function alignOf(cell: string): Align {
  const c = cell.trim();
  if (c.startsWith(":") && c.endsWith(":")) return "center";
  if (c.endsWith(":")) return "right";
  return "left";
}

/** "Total", "total", "TOTAL", "Suma": la última fila que resume. */
const TOTAL_WORD = /^\**\s*(total|suma|totales)\s*\**$/i;

export interface ParseOptions {
  /**
   * El stream sigue abierto. Con esto, el último bloque se marca incompleto si
   * no ha cerrado — sin esto, todo se da por cerrado.
   */
  streaming?: boolean;
}

export function parseMarkdown(
  input: string,
  { streaming = false }: ParseOptions = {}
): Block[] {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushList = () => {
    if (!list) return;
    blocks.push({ kind: "list", ordered: list.ordered, items: list.items });
    list = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();

    // --- Tabla: cabecera + separador. Sin separador no es tabla. ---
    if (isTableRow(line) && i + 1 < lines.length && isDelimiterRow(lines[i + 1])) {
      flushList();
      const header = splitRow(line);
      const align = splitRow(lines[i + 1]).map(alignOf);
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j])) {
        const cells = splitRow(lines[j]);
        // Normalizar al ancho de la cabecera: ni más ni menos columnas.
        while (cells.length < header.length) cells.push("");
        rows.push(cells.slice(0, header.length));
        j++;
      }

      // ¿Cerró? Cerró si tras la última fila hay algo que no es fila, o si el
      // stream ya terminó. Mientras siga abierta y llegando, es incompleta.
      const closed = !streaming || j < lines.length;
      if (!closed) {
        blocks.push({
          kind: "incomplete",
          text: lines.slice(i, j).join("\n"),
        });
        return blocks;
      }

      const last = rows[rows.length - 1];
      blocks.push({
        kind: "table",
        header,
        align,
        rows,
        hasTotalRow: !!last && TOTAL_WORD.test(last[0] ?? ""),
      });
      i = j - 1;
      continue;
    }

    const heading = HEADING.exec(line);
    const ul = UL.exec(line);
    const ol = OL.exec(line);

    if (heading) {
      flushList();
      blocks.push({
        kind: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      });
    } else if (ul) {
      if (list && list.ordered) flushList();
      if (!list) list = { ordered: false, items: [] };
      list.items.push(ul[1]);
    } else if (ol) {
      if (list && !list.ordered) flushList();
      if (!list) list = { ordered: true, items: [] };
      list.items.push(ol[1]);
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      blocks.push({ kind: "paragraph", text: line });
    }
  }
  flushList();
  return blocks;
}

/**
 * Índices de las columnas que **no pintan nada**: todas sus celdas vacías,
 * cabecera incluida. Se colapsan a ancho 0 en vez de repartirse el espacio —
 * en un panel de 448px, una columna vacía le roba sitio a las que sí dicen algo.
 */
export function emptyColumns(table: TableBlock): Set<number> {
  const empty = new Set<number>();
  for (let c = 0; c < table.header.length; c++) {
    const headerEmpty = (table.header[c] ?? "").trim() === "";
    const bodyEmpty = table.rows.every((r) => (r[c] ?? "").trim() === "");
    if (headerEmpty && bodyEmpty) empty.add(c);
  }
  return empty;
}

/** Columnas que de verdad se pintan. Es el número que decide tabla vs filas. */
export function visibleColumnCount(table: TableBlock): number {
  return table.header.length - emptyColumns(table).size;
}
