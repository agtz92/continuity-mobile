import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { ChevronRight } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { THEME_SURFACES } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * El plegado se anima con **Reanimated, no con `LayoutAnimation`**.
 *
 * Antes esto llamaba a `LayoutAnimation.configureNext` sobre un subárbol donde
 * `TaskRow` y `RoutineRow` ya usan animaciones de layout de Reanimated. Son dos
 * sistemas distintos mutando la misma jerarquía de vistas nativas, y en la
 * Nueva Arquitectura —que SDK 54 activa por defecto— eso corrompe el árbol: la
 * pantalla se queda **en blanco con la barra de pestañas encima**, sin lanzar
 * ninguna excepción, y empeora con cada intento. Un sistema de animación por
 * árbol, y aquí el que ya estaba puesto era Reanimated.
 */

export function CollapsibleSection({
  open,
  onToggle,
  icon,
  title,
  rightSlot,
  children,
  variant = "h2",
}: {
  open: boolean;
  onToggle: () => void;
  icon?: ReactNode;
  title: ReactNode;
  rightSlot?: ReactNode;
  children: ReactNode;
  /** "h2" mirrors a dashboard section header; "card" wraps in a bordered box. */
  variant?: "h2" | "card";
}) {
  const { effective } = useTheme();
  const s = THEME_SURFACES[effective];
  const c = useThemeColors();

  const toggle = onToggle;

  // Rotate via inline style, not a toggling className: a className that flips
  // between undefined and a value makes NativeWind's css-interop try to "upgrade"
  // an already-mounted component, whose warning path crashes in Expo Go.
  const chevron = (
    <View style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}>
      <ChevronRight color={s.textMuted} size={16} />
    </View>
  );

  if (variant === "card") {
    return (
      <View className="overflow-hidden rounded-xl border border-border">
        <Pressable
          onPress={toggle}
          accessibilityState={{ expanded: open }}
          className="flex-row items-center gap-2 bg-surface px-3 py-2.5"
        >
          {chevron}
          {icon}
          <Text className="flex-1 font-sans-semibold text-sm text-text">{title}</Text>
          {rightSlot}
        </Pressable>
        <Animated.View layout={LinearTransition.duration(180)}>
          {open && (
            <View className="border-t border-border bg-bg p-3">{children}</View>
          )}
        </Animated.View>
      </View>
    );
  }

  // Cabecera de sección del rediseño: **filete arriba** y titular en display.
  // El filete es lo que separa una sección de la siguiente en toda la app; sin
  // él, ocho secciones seguidas se leen como una sola lista larga.
  return (
    <View>
      <View style={{ height: 1, backgroundColor: c.line[14] }} className="mb-2.5" />
      <Pressable
        onPress={toggle}
        accessibilityState={{ expanded: open }}
        className="-mx-1 mb-3 flex-row flex-wrap items-center gap-2 rounded-md px-1 py-1"
      >
        {chevron}
        {icon}
        <Text
          className="font-display text-text"
          style={{ fontSize: 19, lineHeight: 22, letterSpacing: -0.4 }}
        >
          {title}
        </Text>
        {rightSlot}
      </Pressable>
      <Animated.View layout={LinearTransition.duration(180)}>
        {open && children}
      </Animated.View>
    </View>
  );
}
