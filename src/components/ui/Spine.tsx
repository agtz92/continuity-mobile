import { View } from "react-native";

import type { Priority, ProjectStatus } from "@/lib/types";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * La espina: barra de 3px al borde izquierdo que dice estado y prioridad
 * **antes** de que leas el nombre. Es la firma del sistema — si solo se
 * implementa una cosa nueva del rediseño, es esta.
 *
 * Ya existía a medias: `TaskRow` y `RoutineRow` tenían un `borderLeftWidth: 3`
 * con su propio cálculo de color. Aquí se extrae, se le da el contrato completo
 * y se lleva a proyectos, notas, ideas y celdas de calendario.
 *
 * Contrato (espejo del repo web):
 *
 *   atorado   → sólida `signal`. GANA a la prioridad y a cualquier estado.
 *   lanzado   → sólida `closed`
 *   en pausa  → discontinua (3px sí / 3px no), `line34`
 *   muerto    → sólida `line22`, y el título va tachado
 *   archivado → sólida `line22`, SIN tachar: así se distingue de muerto
 *   idea      → hueca `line14`: presente pero apagada, aún no es compromiso
 *   activo    → por prioridad: crítica `signal` · alta `accent`
 *               media `line34` · baja `line22`
 *
 * "Atorado" **no es un estado del modelo**: se deriva de tener al menos una
 * tarea abierta con blocker, así que quien renderiza pasa `blocked` a mano.
 */

/** ¿El título de esta fila va tachado? Solo lo muerto, nunca lo archivado. */
export function spineStrikesTitle(status: ProjectStatus): boolean {
  return status === "killed";
}

export function Spine({
  status,
  priority = "medium",
  blocked = false,
  /** Alto fijo. Sin él la espina se estira al alto del padre, que es lo normal. */
  height,
}: {
  status: ProjectStatus;
  priority?: Priority;
  blocked?: boolean;
  height?: number;
}) {
  const c = useThemeColors();

  const priorityFill: Record<Priority, string> = {
    critical: c.signal,
    high: c.accent,
    medium: c.line[34],
    low: c.line[22],
  };

  let fill = priorityFill[priority];
  let dashed = false;
  let hollow = false;

  if (blocked) {
    fill = c.signal;
  } else {
    switch (status) {
      case "launched":
        fill = c.closed;
        break;
      case "paused":
        fill = c.line[34];
        dashed = true;
        break;
      case "killed":
      case "archived":
        fill = c.line[22];
        break;
      case "idea":
        fill = c.line[14];
        hollow = true;
        break;
      default:
        break;
    }
  }

  // Discontinua: en RN no hay `repeating-linear-gradient`, así que la pausa se
  // dibuja con segmentos. Seis bastan para leerse como raya en una fila normal.
  if (dashed) {
    return (
      <View
        accessible={false}
        style={{ width: 3, height, alignSelf: "stretch", overflow: "hidden" }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <View
            key={i}
            style={{
              height: 3,
              marginBottom: 3,
              backgroundColor: fill,
            }}
          />
        ))}
      </View>
    );
  }

  return (
    <View
      accessible={false}
      style={{
        width: 3,
        height,
        alignSelf: "stretch",
        // Hueca: se ve el contorno, no el relleno. Es "presente pero apagado".
        backgroundColor: hollow ? "transparent" : fill,
        borderWidth: hollow ? 1 : 0,
        borderColor: fill,
      }}
    />
  );
}
