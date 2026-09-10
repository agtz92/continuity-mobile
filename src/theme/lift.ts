import type { ViewStyle } from "react-native";
import type { ThemeColors } from "@/theme/useThemeColors";

/**
 * Lo único que tiene permiso de flotar.
 *
 * El rediseño es papel y filete: **una sombra suave es lo que hacía que la app
 * pareciera de otra familia**, y en el tema claro un halo con el color de acento
 * se leía directamente como un error de render. Aquí queda un solo helper, con
 * dos alturas, y su color sale del token del tema (`shadow`), no del acento:
 *
 * - `drag`   — lo que el dedo está levantando ahora mismo.
 * - `float`  — lo que vive por encima de la página siempre: FAB, toast, hoja.
 *
 * Todo lo demás se separa del fondo con **el filete**, que es lo que el sistema
 * usa para decir "esto es otra superficie".
 */
export function lift(level: "drag" | "float", c: ThemeColors): ViewStyle {
  const h = level === "drag" ? 6 : 3;
  return {
    shadowColor: c.shadow,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: h },
    shadowRadius: level === "drag" ? 14 : 8,
    // Android no lee `shadowColor`/`shadowOpacity`: solo la elevación.
    elevation: level === "drag" ? 8 : 4,
  };
}
