import { alpha, type ThemeColors } from "@/theme/useThemeColors";

/**
 * El semáforo de la pantalla Hoy, ahora atado al tema.
 *
 * Antes esto eran tuplas fijas —`RED`, `ORANGE`, `AMBER`, `PURPLE`— y sus hex
 * tintados. Estaban "hardcodeados a propósito: no dependen del tema", y esa
 * decisión es exactamente **lo que hacía que el tema claro se viera ajeno**: un
 * rojo de Tailwind sobre papel crema no es de la misma familia que nada.
 *
 * El rediseño deja tres voces y ninguna más:
 *
 *   `signal`  → vencido, bloqueado, lo que duele
 *   `accent`  → hoy, lo que pide atención pero no es urgencia
 *   `closed`  → hecho
 *
 * Y para lo que no es ninguna de las tres, la **rampa de reglas**: el
 * enfriamiento se dice con el peso de la tinta, no con un color nuevo.
 */

/**
 * Tinta del "días sin tocar". El enfriamiento **se lee en el peso**, no en un
 * tono nuevo: cuanto más viejo, más tinta, hasta que a los 30 días sí duele.
 */
export function touchInk(days: number, c: ThemeColors): string {
  if (days >= 30) return c.signal;
  if (days >= 15) return c.text3;
  if (days >= 7) return c.text5;
  return c.text5;
}

/**
 * Tinte del punto de proyecto dormido, por tramo de antigüedad.
 *
 * Delega en `touchInk` a propósito: el punto y el contador de días tienen que
 * decir lo mismo, y la única forma de garantizarlo es que uno llame al otro.
 */
export function sleepingDot(
  bucket: "7-14" | "15-30" | "30+",
  c: ThemeColors
): string {
  return touchInk(bucket === "30+" ? 30 : bucket === "15-30" ? 15 : 7, c);
}

/**
 * Los tres tonos de una tarjeta de foco (vencida / hoy / estancada / próximo
 * paso), resueltos de una vez para que las tres pantallas que los usan no
 * inventen cada una los suyos.
 *
 * `stalled` **no tiene color propio**: un proyecto que se enfría no es una
 * urgencia, así que se dice con tinta apagada. Antes era ámbar y competía
 * visualmente con lo que sí vence hoy.
 */
export function focusTint(
  type: string,
  c: ThemeColors
): { tint: string; border: string; spine: string } {
  if (type === "overdue") {
    return { tint: c.signal, border: alpha(c.signal, 0.3), spine: c.signal };
  }
  if (type === "today") {
    return { tint: c.accent, border: alpha(c.accent, 0.3), spine: c.accent };
  }
  if (type === "stalled") {
    return { tint: c.text3, border: c.line[22], spine: c.line[34] };
  }
  return { tint: c.accent, border: c.border, spine: c.accent };
}
