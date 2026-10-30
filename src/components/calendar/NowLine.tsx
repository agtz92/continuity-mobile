import { memo } from "react";
import { Text, View } from "react-native";

import type { ThemeColors } from "@/theme/useThemeColors";

/**
 * La línea "ahora" del Día: 2 px en `signal` a lo ancho del área de eventos,
 * punto de 8 px a la izquierda (entrando 6 px en el canal de horas) y la
 * etiqueta "NOW 2:37" a la derecha. La hora la pasa la pantalla, que la
 * actualiza con un solo intervalo de 60 s.
 */
export const NowLine = memo(function NowLine({
  top,
  gutter,
  label,
  colors: c,
}: {
  top: number;
  gutter: number;
  label: string;
  colors: ThemeColors;
}) {
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", top, left: gutter - 6, right: 0, height: 0 }}
    >
      <View style={{ position: "absolute", left: 0, right: 0, top: -1, height: 2, backgroundColor: c.signal }} />
      <View
        style={{
          position: "absolute",
          left: -4,
          top: -4,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: c.signal,
        }}
      />
      <Text
        className="font-sans-bold uppercase"
        style={{
          position: "absolute",
          right: 0,
          top: -8,
          fontSize: 11,
          letterSpacing: 0.8,
          color: c.signal,
          backgroundColor: c.bg,
          paddingHorizontal: 4,
          fontVariant: ["tabular-nums"],
        }}
      >
        {label}
      </Text>
    </View>
  );
});
