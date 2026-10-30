import { memo } from "react";
import { Pressable } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Botón-icono de 44×44. Sustituye a cada `Pressable` + `hitSlop` con un icono
 * de 14 px: el blanco de toque ahora es la caja, no una promesa invisible.
 * `label` es obligatorio: un icono sin nombre no existe para VoiceOver.
 */
export const IconAction = memo(function IconAction({
  icon: Icon,
  label,
  onPress,
  tone = "muted",
  size = SIZE.hit,
  iconSize = 20,
  filled = false,
  disabled = false,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  tone?: "muted" | "text" | "accent" | "signal";
  /** Caja; 44 salvo casos documentados (deshacer en "Done today", 40). */
  size?: number;
  iconSize?: number;
  /** Círculo con fondo `surface` y filete: acciones de cabecera de Today. */
  filled?: boolean;
  disabled?: boolean;
}) {
  const c = useThemeColors();
  const color =
    tone === "accent"
      ? c.accent
      : tone === "signal"
        ? c.signal
        : tone === "text"
          ? c.text
          : c.text3;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      className="items-center justify-center active:opacity-60"
      style={[
        { width: size, height: size, borderRadius: filled ? size / 2 : 8 },
        filled ? { backgroundColor: c.surface, borderWidth: 1, borderColor: c.line[14] } : null,
        disabled ? { opacity: 0.4 } : null,
      ]}
    >
      <Icon size={iconSize} color={color} />
    </Pressable>
  );
});
