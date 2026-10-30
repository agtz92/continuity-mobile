import { memo, type ReactNode } from "react";
import { Pressable, View } from "react-native";

import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * La fila base de toda lista del rediseño: alto mínimo 56, regla de 1 px
 * (`line-14`) debajo y, cuando hay estado, una espina de 3 px a la izquierda.
 * Una sola tarjeta por fila — aquí no hay tarjeta: es la regla la que separa.
 */
export const RuledRow = memo(function RuledRow({
  spine,
  leading,
  trailing,
  onPress,
  onLongPress,
  last = false,
  accessibilityLabel,
  children,
}: {
  /** Color de la espina (`signal`, `accent`, color de categoría…). */
  spine?: string | null;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Sin regla inferior (última fila de un bloque). */
  last?: boolean;
  accessibilityLabel?: string;
  children: ReactNode;
}) {
  const c = useThemeColors();
  const body = (
    <View
      className="flex-row items-start"
      style={{
        minHeight: SIZE.row,
        paddingVertical: 12,
        paddingLeft: spine ? 12 : 0,
        gap: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.line[14],
      }}
    >
      {spine ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 10,
            bottom: 10,
            width: 3,
            borderRadius: 2,
            backgroundColor: spine,
          }}
        />
      ) : null}
      {leading}
      <View className="min-w-0 flex-1">{children}</View>
      {trailing}
    </View>
  );
  if (!onPress && !onLongPress) return body;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="active:opacity-70"
    >
      {body}
    </Pressable>
  );
});
