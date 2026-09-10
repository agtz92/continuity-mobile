/**
 * Superficies y tintas por modo de tema.
 *
 * **Espejo manual del repo web** (`continuity/frontend/src/design/tokens.json`).
 * No es monorepo: los hex se replican a mano y esa duplicación es la regla del
 * proyecto, no un descuido. Los valores de aquí salen del commit web
 * `60c8996` — si cambias uno, cámbialo allí también.
 *
 * La escala pasó de cinco claves a la completa. Los nombres viejos (`border`,
 * `textMuted`, `accent2`) siguen resolviendo como alias para que los cientos de
 * usos de `bg-surface` y `text-text-muted` no se rompan; mueren en la última PR.
 */

/**
 * Los tres modos efectivos. **`light` NO se renombró a `paper`**: el canvas lo
 * etiqueta "Papel" pero su identificador ya existía en el código y, sobre todo,
 * en el backend, que valida contra `{continuu, light, carbon, system}`.
 * Renombrarlo aquí haría que el servidor rechazara el tema y el usuario lo
 * perdiera. Los que sí cambiaron son `continuuit → continuu` y `dark → carbon`.
 */
export type EffectiveMode = "continuu" | "light" | "carbon";

export type Surfaces = {
  /** Fondo del documento, fuera de superficies. */
  canvas: string;
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  /** Columnas laterales hundidas. */
  well: string;

  text: string;
  text2: string;
  text3: string;
  text4: string;
  text5: string;
  /** Solo controles deshabilitados. Exento de AA. */
  textOff: string;

  /** Bloqueado, vencido, error, foco. No personalizable: es semántica. */
  signal: string;
  /** Completado, cerrado a propósito. Tampoco personalizable. */
  closed: string;

  toastBg: string;
  toastText: string;
  shadow: string;
  /** Base de las reglas, como tupla "r,g,b" para `alpha()`. */
  lineRgb: string;

  // --- Alias de compatibilidad. Mueren en la PR de limpieza. ---
  border: string;
  textMuted: string;
  /** Sin semántica propia: cada uso se reclasifica en signal / closed / fuera. */
  accent2: string;
};

export const THEME_SURFACES: Record<EffectiveMode, Surfaces> = {
  // El navy de la casa.
  continuu: {
    canvas: "#070914",
    bg: "#0C0F26",
    surface: "#101430",
    surface2: "#141935",
    surface3: "#1A2044",
    well: "#0A0D22",
    text: "#F5F1E8",
    text2: "#CFD3E6",
    text3: "#A6ABC8",
    text4: "#8A90AE",
    text5: "#7B819E",
    textOff: "#5B5F7C",
    signal: "#F0714E",
    closed: "#6FCF97",
    toastBg: "#050710",
    toastText: "#F5F1E8",
    shadow: "rgba(0,0,0,0.9)",
    lineRgb: "245,241,232",
    border: "rgba(245,241,232,0.10)",
    textMuted: "#8A90AE",
    accent2: "#E08A5A",
  },

  // Claro: off-white cálido, el navy pasa de fondo a tinta.
  light: {
    canvas: "#E9E5DA",
    bg: "#F7F5EF",
    surface: "#FFFDF8",
    surface2: "#EFEBDF",
    surface3: "#E5E0D0",
    well: "#FBF9F3",
    text: "#14172B",
    text2: "#34322A",
    text3: "#4E4B3E",
    text4: "#5B5949",
    text5: "#6A6657",
    textOff: "#8A8778",
    signal: "#C0341B",
    closed: "#1F6B45",
    toastBg: "#14172B",
    toastText: "#FBF9F3",
    shadow: "rgba(74,62,36,0.26)",
    // Sepia, no la tinta azul de los temas oscuros: con la tinta fría todos
    // los filetes salían gris y el papel se seguía viendo como el `light` viejo.
    lineRgb: "92,78,46",
    // El hairline del papel es un valor propio (#D8D2C2): la rampa alfa no
    // llega hasta ahí desde ningún escalón razonable.
    border: "#D8D2C2",
    textMuted: "#5B5949",
    accent2: "#9A4A16",
  },

  // Oscuro neutro: carbón cálido, sin azul. NO es continuu invertido.
  carbon: {
    canvas: "#0B0A09",
    bg: "#131210",
    surface: "#1A1815",
    surface2: "#201D18",
    surface3: "#2A2620",
    well: "#0F0E0C",
    text: "#F1EDE3",
    text2: "#D6D0C2",
    text3: "#A9A192",
    text4: "#8B8474",
    text5: "#8B8474",
    textOff: "#635E52",
    signal: "#E8674A",
    closed: "#7FA98A",
    toastBg: "#050505",
    toastText: "#F1EDE3",
    shadow: "rgba(0,0,0,0.85)",
    lineRgb: "241,237,227",
    border: "rgba(241,237,227,0.10)",
    textMuted: "#8B8474",
    accent2: "#E08A5A",
  },
};

/**
 * Los escalones de la rampa de reglas que el sistema usa de verdad. Existe
 * para que `useThemeColors` los construya de una vez y nadie invente un 0.17.
 */
export const LINE_STEPS = [4, 8, 10, 14, 18, 22, 34] as const;
export type LineStep = (typeof LINE_STEPS)[number];
