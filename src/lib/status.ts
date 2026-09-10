import {
  AlertCircle,
  Archive,
  Lightbulb,
  Pause,
  Rocket,
  Skull,
  Zap,
} from "lucide-react-native";
import type { ProjectStatus } from "@/lib/types";

/**
 * El icono por estado, y nada más.
 *
 * Aquí vivían además un juego de clases de Tailwind por estado (`color`), otro
 * de bordes (`statusBorderClass`) y un `fallbackStatusIcon`. **Ninguno tenía un
 * solo uso**, y los tres llevaban el mismo comentario diciendo que los colores
 * se quedaban fijos "para que no cambien de tono si eliges Pink o Neon". Quien
 * pinta el estado hoy es `components/projects/StatusBadge` y la espina, con los
 * tokens del tema.
 *
 * Las etiquetas NO están aquí porque dependen del idioma: se resuelven con
 * `t("status.<estado>")`.
 */
export const statusConfig: Record<
  ProjectStatus,
  { icon: React.ComponentType<{ size?: number }> }
> = {
  idea: { icon: Lightbulb },
  active: { icon: Zap },
  stalled: { icon: AlertCircle },
  paused: { icon: Pause },
  launched: { icon: Rocket },
  killed: { icon: Skull },
  archived: { icon: Archive },
};

export const STATUS_FILTER_ORDER: Array<"all" | ProjectStatus> = [
  "all",
  "active",
  "stalled",
  "idea",
  "paused",
  "launched",
  "killed",
  "archived",
];
