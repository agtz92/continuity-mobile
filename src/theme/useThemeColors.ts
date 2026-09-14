import { useMemo } from "react";
import { useTheme } from "./ThemeProvider";
import { LINE_STEPS, THEME_SURFACES, type LineStep } from "./tokens";
import { accentsFor } from "../palette/config";

/**
 * Los colores del tema activo ya resueltos.
 *
 * En RN no hay `color-mix` ni `var()` en todos los sitios, así que esto es lo
 * que se usa donde `className` no llega: el `color` de los iconos de lucide y
 * cualquier alfa sobre un color del tema. Los colores sólidos (`bg-accent`,
 * `text-text-muted`…) siguen funcionando como clase.
 */
export type ThemeColors = {
  canvas: string;
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  well: string;
  /** Velo del contenido de fondo. Ver `tokens.ts`. */
  scrim: string;

  text: string;
  text2: string;
  text3: string;
  text4: string;
  text5: string;
  textOff: string;

  accent: string;
  accentHi: string;
  accentLo: string;

  signal: string;
  closed: string;

  toastBg: string;
  toastText: string;
  shadow: string;

  /** La rampa de reglas ya calculada: `line[10]`, `line[22]`… */
  line: Record<LineStep, string>;
  /** Tupla "r,g,b" por si hace falta un alfa fuera de la rampa. */
  lineRgb: string;

  // --- Alias de compatibilidad. Mueren en la PR de limpieza. ---
  border: string;
  textMuted: string;
  accent2: string;
};

export function useThemeColors(): ThemeColors {
  const { effective, palette } = useTheme();
  return useMemo(() => {
    const s = THEME_SURFACES[effective];
    const [accent, accentHi, accentLo] = accentsFor(palette, effective);

    const line = Object.fromEntries(
      LINE_STEPS.map((n) => [n, alpha(s.lineRgb, n / 100)])
    ) as Record<LineStep, string>;

    return {
      canvas: s.canvas,
      bg: s.bg,
      surface: s.surface,
      surface2: s.surface2,
      surface3: s.surface3,
      well: s.well,
      scrim: s.scrim,
      text: s.text,
      text2: s.text2,
      text3: s.text3,
      text4: s.text4,
      text5: s.text5,
      textOff: s.textOff,
      accent,
      accentHi,
      accentLo,
      signal: s.signal,
      closed: s.closed,
      toastBg: s.toastBg,
      toastText: s.toastText,
      shadow: s.shadow,
      line,
      lineRgb: s.lineRgb,
      border: s.border,
      textMuted: s.textMuted,
      accent2: s.accent2,
    };
  }, [effective, palette]);
}

/**
 * Color + alfa → `rgba(...)`.
 *
 * Acepta **hex y tupla "r,g,b"**. Las dos formas hacen falta y ya convivían en
 * este archivo sin decirlo: los acentos son hex, pero la base de las reglas
 * (`lineRgb`) es una tupla, igual que las categorías de `FIXED_CATEGORY`. Con
 * la versión anterior, que solo parseaba hex, `alpha(lineRgb, .1)` devolvía
 * `rgba(NaN, NaN, NaN, .1)` **sin lanzar**: un color inválido que RN pinta como
 * transparente y que nadie detecta hasta que ve la pantalla.
 */
export function alpha(color: string, a: number): string {
  // `rgb(r,g,b)` se desenvuelve a la tupla: el panel de analítica conserva su
  // set propio en esa forma y hay sitios que mezclan ambas.
  const c = color.trim().replace(/^rgba?\(/, "").replace(/\)$/, "");

  // Tupla "r,g,b" o "r, g, b".
  if (c.includes(",")) {
    const parts = c.split(",").map((p) => Number(p.trim()));
    if (parts.length >= 3 && parts.every((n) => Number.isFinite(n))) {
      const [r, g, b] = parts;
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  }

  let h = c.replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((x) => x + x)
      .join("");
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
    // Antes esto devolvía "rgba(NaN,...)" y se pintaba transparente. Devolver
    // el color original al menos deja algo visible y no una ausencia.
    return color;
  }
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Las categorías dejan de ser un semáforo.
 *
 * Antes cada categoría traía su color fijo de la paleta de Tailwind, y ocho
 * chips de colores distintos en una lista la convertían en un semáforo donde
 * ninguno destacaba. El rediseño lo resuelve como en web: **el chip es neutro y
 * el color vive en una muesca de 3px**, que sigue distinguiendo sin gritar.
 *
 * `dot` conserva el color de la categoría —es el único trozo que lo lleva— y
 * `bg`/`text`/`border` pasan a la regla. `blue` y `emerald` ya no se atan al
 * acento del usuario: una categoría no debería cambiar de color al cambiar de
 * paleta.
 */
const CATEGORY_DOT: Record<string, string> = {
  purple: "rgb(192,132,252)",
  amber: "rgb(251,191,36)",
  rose: "rgb(251,113,133)",
  cyan: "rgb(34,211,238)",
  indigo: "rgb(129,140,248)",
  pink: "rgb(244,114,182)",
  lime: "rgb(163,230,53)",
  orange: "rgb(251,146,60)",
  blue: "rgb(96,165,250)",
  emerald: "rgb(52,211,153)",
};

export type CategoryChipColors = {
  bg: string;
  text: string;
  border: string;
  dot: string;
};

/** Versión resuelta en RN de `categoryColorClass` de web. */
export function categoryChipColors(
  color: string,
  c: ThemeColors
): CategoryChipColors {
  return {
    bg: "transparent",
    text: c.text3,
    border: c.line[14],
    dot: CATEGORY_DOT[color] ?? c.line[34],
  };
}
