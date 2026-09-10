/**
 * Los temas que el usuario puede elegir, y cómo se leen los guardados.
 *
 * **Dos listas a propósito, no una.** `isTheme` es el camino de ESCRITURA y
 * solo acepta los nombres canónicos; `normalizeTheme` es el de LECTURA y acepta
 * además los viejos. Sin esa separación, un valor retirado seguiría entrando al
 * sistema cada vez que alguien recarga.
 *
 * Esto no es aseo: **hoy está roto**. La web ya escribe `continuu` y `carbon`
 * en el servidor, y `ThemeProvider` valida lo que llega con `isTheme`. Con la
 * lista vieja, un tema cambiado desde la web se ignoraba en silencio y los dos
 * clientes mostraban cosas distintas.
 */

/** Lo que se puede guardar. `system` sigue siendo la cuarta opción. */
export const SUPPORTED_THEMES = ["continuu", "light", "carbon", "system"] as const;
export type Theme = (typeof SUPPORTED_THEMES)[number];
export const DEFAULT_THEME: Theme = "continuu";

export const THEME_COOKIE = "NEXT_THEME";

/**
 * Nombres retirados → su equivalente. `light` NO está aquí porque **no
 * cambió**: el canvas lo llama "Papel" pero su id sigue siendo `light`, y el
 * backend valida contra él.
 */
const LEGACY_THEME_MAP: Record<string, Theme> = {
  continuuit: "continuu",
  dark: "carbon",
};

/** Camino de escritura: solo canónicos. */
export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (SUPPORTED_THEMES as readonly string[]).includes(value);
}

/**
 * Camino de lectura: acepta lo guardado antes del rediseño, venga de
 * AsyncStorage o del backend. Devuelve `null` si no se reconoce, para que quien
 * llame decida el fallback en vez de heredar un valor inventado.
 */
export function normalizeTheme(value: unknown): Theme | null {
  if (isTheme(value)) return value;
  if (typeof value === "string" && value in LEGACY_THEME_MAP) {
    return LEGACY_THEME_MAP[value];
  }
  return null;
}

export const THEME_LABEL_KEY: Record<Theme, string> = {
  continuu: "themeContinuu",
  light: "themeLight",
  carbon: "themeCarbon",
  system: "themeSystem",
};
