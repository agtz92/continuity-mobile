import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react-native";
import { statusConfig } from "@/lib/status";
import type { ProjectStatus } from "@/lib/types";
import { alpha, useThemeColors, type ThemeColors } from "@/theme/useThemeColors";

/**
 * Badge de estado: icono + etiqueta.
 *
 * Antes cada estado tenía su hex saturado —morado, esmeralda, ámbar, pizarra,
 * azul, rojo— "theme-independent" a propósito. Esa era justo la decisión que
 * hacía que la pantalla se viera ajena al tema, y siete colores no jerarquizan:
 * un proyecto muerto gritaba tan fuerte como uno activo.
 *
 * El rediseño usa **el mismo vocabulario que la espina** (`components/ui/Spine`),
 * porque la barra de la fila y el badge del detalle tienen que decir lo mismo:
 *
 *   activo    → acento          lanzado   → `closed`
 *   idea      → tinta apagada   pausado   → tinta apagada
 *   estancado → tinta apagada   muerto/archivado → tinta más apagada aún
 *
 * Lo que distingue estancado de pausado de idea es **el icono** (`statusConfig`)
 * y la palabra, no el tono: en una captura en gris el badge sigue leyéndose.
 */
type Look = { ink: string; fill: string; border: string };

function look(status: ProjectStatus, c: ThemeColors): Look {
  switch (status) {
    case "active":
      return { ink: c.accent, fill: alpha(c.accent, 0.12), border: alpha(c.accent, 0.35) };
    case "launched":
      return { ink: c.closed, fill: alpha(c.closed, 0.12), border: alpha(c.closed, 0.35) };
    case "killed":
    case "archived":
      // Lo cerrado no compite por atención. Se dice con el peso más bajo.
      return { ink: c.text4, fill: c.line[4], border: c.line[14] };
    default:
      // idea · stalled · paused: presentes, pero aún no son un compromiso vivo.
      return { ink: c.text3, fill: c.line[8], border: c.line[22] };
  }
}

export function StatusBadge({
  status,
  size = "sm",
  onPress,
}: {
  status: ProjectStatus;
  size?: "sm" | "md";
  /** Con esto el badge deja de ser etiqueta y pasa a ser control: el estado
   *  se cambia tocándolo, que es lo que hace que se lea como un estado y no
   *  como una decoración. */
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const Icon = statusConfig[status].icon as React.ComponentType<{
    size?: number;
    color?: string;
  }>;
  const { ink, fill, border } = look(status, c);
  const iconSize = size === "md" ? 14 : 12;

  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      className={
        "flex-row items-center gap-1.5 self-start rounded-full border px-2.5 py-0.5" +
        (onPress ? " active:opacity-70" : "")
      }
      style={{ backgroundColor: fill, borderColor: border }}
    >
      {/* Los iconos de RN no heredan `currentColor` de className. */}
      <Icon size={iconSize} color={ink} />
      <Text
        className={"font-sans-medium " + (size === "md" ? "text-sm" : "text-xs")}
        style={{ color: ink }}
      >
        {t(`status.${status}`)}
      </Text>
      {onPress && <ChevronDown size={12} color={ink} />}
    </Wrapper>
  );
}
