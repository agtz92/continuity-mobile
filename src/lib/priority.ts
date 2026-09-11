import type { Priority } from "@/lib/types";
import type { ThemeColors } from "@/theme/useThemeColors";

/**
 * Prioridad como señal, no como semáforo. **Espejo del repo web**
 * (`frontend/src/lib/priority.ts`).
 *
 * Antes esto eran colores fijos de Tailwind (rojo/naranja/esmeralda/azul) con
 * variante `dark:`, y el comentario decía que se quedaban fijos a propósito
 * "para que el significado no cambie si eliges Pink o Neon". El rediseño lo
 * invierte: cuatro colores saturados en una lista de catorce proyectos no
 * jerarquizan nada, y un rojo de Tailwind sobre papel crema no es de la familia
 * de nada. Solo la crítica y la alta tienen tinta propia; media y baja se dicen
 * con **el peso de la regla**.
 *
 * El orden de intensidad es el mismo que usa `<Spine>`, a propósito: la barra
 * de la fila y el punto del detalle tienen que decir lo mismo. Si cambias uno,
 * cambia el otro (`priorityFill` en `components/ui/Spine.tsx`).
 */
export function priorityFill(p: Priority, c: ThemeColors): string {
  switch (p) {
    case "critical":
      return c.signal;
    case "high":
      return c.accent;
    case "medium":
      return c.line[34];
    default:
      return c.line[22];
  }
}

export type ProjectSortMode =
  | "smart"
  /** "Frío primero": lo que lleva más tiempo sin tocarse arriba. Es el inverso
   *  de `recent` y el orden que el rediseño quiere como opción de primera. */
  | "cold"
  /** Agrupado por categoría. Los sueltos van al final: son el resto, no un
   *  grupo más. */
  | "category"
  | "manual"
  | "priority"
  | "recent"
  | "name"
  | "status";

/** Mismo orden que en web, para que el selector no se lea distinto. */
export const PROJECT_SORT_MODES: ProjectSortMode[] = [
  "smart",
  "cold",
  "category",
  "manual",
  "priority",
  "recent",
  "name",
  "status",
];
