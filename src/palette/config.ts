/**
 * Las paletas de acento: cinco curadas, no once.
 *
 * **Espejo manual del repo web** (`src/design/tokens.json`, commit `60c8996`).
 * Solo pisan `accent`, `accentHi` y `accentLo`. `signal` y `closed` **no** son
 * personalizables: son semántica, no gusto — que "bloqueado" cambie de color
 * según la paleta del usuario es exactamente lo que rompía el significado.
 *
 * Como en los temas, hay **dos caminos**: `isPalette` para escribir (solo
 * canónicas) y `normalizePalette` para leer (acepta las once retiradas). La
 * migración del dato la corrió web; aquí solo hace falta saber leer lo viejo.
 */

/** Lo que se puede guardar hoy. */
export const SUPPORTED_PALETTES = [
  "ocre",
  "salvia",
  "oxido",
  "hielo",
  "ciruela",
] as const;
export type Palette = (typeof SUPPORTED_PALETTES)[number];
export const DEFAULT_PALETTE: Palette = "ocre";

export const PALETTE_COOKIE = "NEXT_PALETTE";

/**
 * Las once retiradas → su equivalente curada. Mismo mapa que en web: si aquí
 * dijera otra cosa, cambiar de dispositivo cambiaría de color.
 */
const LEGACY_PALETTE_MAP: Record<string, Palette> = {
  default: "ocre",
  continuuit: "ocre",
  green: "salvia",
  turquoise: "salvia",
  pink: "ciruela",
  cute: "ciruela",
  complimentary: "ciruela",
  business: "hielo",
  midnight: "hielo",
  retro: "hielo",
  neon: "oxido",
  sunset: "oxido",
  boho: "oxido",
};

/** Camino de escritura: solo canónicas. */
export function isPalette(value: unknown): value is Palette {
  return (
    typeof value === "string" &&
    (SUPPORTED_PALETTES as readonly string[]).includes(value)
  );
}

/** Camino de lectura: traduce lo retirado. `null` si no se reconoce. */
export function normalizePalette(value: unknown): Palette | null {
  if (isPalette(value)) return value;
  if (typeof value === "string" && value in LEGACY_PALETTE_MAP) {
    return LEGACY_PALETTE_MAP[value];
  }
  return null;
}

export const PALETTE_LABEL_KEY: Record<Palette, string> = {
  ocre: "paletteOcre",
  salvia: "paletteSalvia",
  oxido: "paletteOxido",
  hielo: "paletteHielo",
  ciruela: "paletteCiruela",
};

/** `[accent, accentHi, accentLo]`. */
export type AccentTriplet = [string, string, string];

/**
 * Dos juegos por paleta, no un filtro.
 *
 * En el tema claro el acento **se oscurece** para pasar AA sobre el papel —
 * y no se calcula, se elige: aclarar u oscurecer por fórmula produce colores
 * sucios. Los oscuros (`continuu` y `carbon`) comparten juego.
 */
export const PALETTE_ACCENTS: Record<
  Palette,
  { dark: AccentTriplet; light: AccentTriplet }
> = {
  ocre: {
    dark: ["#D4A847", "#E5BC5E", "#BC9036"],
    light: ["#8A6410", "#A97C1D", "#6B4C08"],
  },
  salvia: {
    dark: ["#8FB98A", "#A8CEA3", "#6E9A69"],
    light: ["#3F6B45", "#527F58", "#2C5231"],
  },
  oxido: {
    dark: ["#E08A5A", "#F0A375", "#B96C40"],
    light: ["#9A4A16", "#B45E27", "#7A390E"],
  },
  hielo: {
    dark: ["#8FB4D9", "#A9C9EA", "#6E93B8"],
    light: ["#1F4E79", "#2E6494", "#153A5C"],
  },
  ciruela: {
    dark: ["#C08AC0", "#D3A4D3", "#9C689C"],
    light: ["#6B2E6B", "#843E84", "#511F51"],
  },
};

/**
 * El acento de una paleta bajo un modo. `light` es el único claro; los dos
 * oscuros comparten juego, que es la razón de que sean dos y no tres.
 */
export function accentsFor(
  palette: Palette,
  mode: "continuu" | "light" | "carbon"
): AccentTriplet {
  return PALETTE_ACCENTS[palette][mode === "light" ? "light" : "dark"];
}

/**
 * Muestras del selector. Ahora son dos tonos del MISMO acento (normal e
 * intenso), no acento + acento-2: `accent2` deja de existir como color de
 * marca, así que enseñarlo prometería algo que el tema ya no pinta.
 */
export const PALETTE_SWATCHES: Record<
  Palette,
  { dark: [string, string]; light: [string, string] }
> = Object.fromEntries(
  (SUPPORTED_PALETTES as readonly Palette[]).map((p) => [
    p,
    {
      dark: [PALETTE_ACCENTS[p].dark[0], PALETTE_ACCENTS[p].dark[1]] as [
        string,
        string,
      ],
      light: [PALETTE_ACCENTS[p].light[0], PALETTE_ACCENTS[p].light[1]] as [
        string,
        string,
      ],
    },
  ])
) as Record<Palette, { dark: [string, string]; light: [string, string] }>;
