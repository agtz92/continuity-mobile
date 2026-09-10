import { Text, View, type TextProps } from "react-native";
import type { ReactNode } from "react";

import { useThemeColors } from "@/theme/useThemeColors";

/**
 * El titular de una pantalla. Un solo sitio para la escala de display, porque
 * antes eran nueve `text-2xl font-bold` iguales y cualquier ajuste había que
 * hacerlo nueve veces.
 *
 * Va en **Instrument Sans** con tracking negativo: es la voz de la marca y lo
 * único de la pantalla que tiene permiso de ser grande. El `right` es para lo
 * que acompaña al título sin competir con él (un contador, un botón).
 */
export function ScreenTitle({
  children,
  right,
  ...rest
}: { children: ReactNode; right?: ReactNode } & TextProps) {
  const c = useThemeColors();
  const title = (
    <Text
      accessibilityRole="header"
      className="font-display"
      style={{ fontSize: 30, lineHeight: 32, letterSpacing: -1, color: c.text }}
      {...rest}
    >
      {children}
    </Text>
  );
  if (!right) return title;
  return (
    <View className="flex-row items-end justify-between gap-3">
      <View className="min-w-0 flex-1">{title}</View>
      {right}
    </View>
  );
}
