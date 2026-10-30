import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { useThemeColors } from "@/theme/useThemeColors";

/**
 * El titular "con la cifra que importa" del rediseño: `"18 open."` arriba y
 * `"2 overdue."` debajo. La segunda línea va en `text2`, o en `signal` cuando
 * nombra algo que duele (vencido, bloqueado, tarde).
 *
 * Sustituye a `ScreenTitle` + `Text` sueltos. El título nunca se corta: si no
 * cabe, envuelve. `right` es para lo que acompaña sin competir (avatar, botón).
 */
export function ScreenHeadline({
  primary,
  secondary,
  secondaryTone = "muted",
  right,
  size = 34,
}: {
  primary: string;
  secondary?: string | null;
  secondaryTone?: "muted" | "signal";
  right?: ReactNode;
  /** 34 en pantallas de pestaña; 26 en titulares de periodo (Calendar). */
  size?: number;
}) {
  const c = useThemeColors();
  const line = { fontSize: size, lineHeight: Math.round(size * 1.06), letterSpacing: -1 };
  const title = (
    <View accessible accessibilityRole="header">
      <Text className="font-display" style={[line, { color: c.text }]}>
        {primary}
      </Text>
      {secondary ? (
        <Text
          className="font-display"
          style={[line, { color: secondaryTone === "signal" ? c.signal : c.text2 }]}
        >
          {secondary}
        </Text>
      ) : null}
    </View>
  );
  if (!right) return title;
  return (
    <View className="flex-row items-start justify-between gap-3">
      <View className="min-w-0 flex-1">{title}</View>
      {right}
    </View>
  );
}
