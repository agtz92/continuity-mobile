import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";

import { SectionHeader } from "@/components/ui/SectionHeader";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Sección plegable del rediseño: `SectionHeader` sobre fondo plano + cuerpo.
 * Ya no hay variante "card": la tarjeta exterior de los buckets de Tasks y
 * Routines producía card-en-card con las filas.
 *
 * El plegado se anima con **Reanimated, no con `LayoutAnimation`**. Antes esto
 * llamaba a `LayoutAnimation.configureNext` sobre un subárbol donde `TaskRow` y
 * `RoutineRow` ya usan animaciones de layout de Reanimated; en la Nueva
 * Arquitectura eso deja la pantalla en blanco sin lanzar excepción. Un sistema
 * de animación por árbol, y aquí el que ya estaba puesto era Reanimated.
 */
export function CollapsibleSection({
  open,
  onToggle,
  title,
  meta,
  trailing,
  icon,
  tone,
  ruled = true,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  /** Conteos en segunda línea, versalitas. */
  meta?: ReactNode;
  trailing?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "signal";
  /** Regla de 1 px sobre la cabecera: separa una sección de la siguiente. */
  ruled?: boolean;
  children: ReactNode;
}) {
  const c = useThemeColors();
  return (
    <View>
      {ruled ? <View style={{ height: 1, backgroundColor: c.line[14], marginBottom: 4 }} /> : null}
      <SectionHeader
        title={title}
        meta={meta}
        icon={icon}
        open={open}
        onToggle={onToggle}
        trailing={trailing}
        tone={tone}
      />
      <Animated.View layout={LinearTransition.duration(150)}>
        {open ? <View style={{ paddingTop: 4 }}>{children}</View> : null}
      </Animated.View>
    </View>
  );
}
