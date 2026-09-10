import { Text, type TextProps } from "react-native";

import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Una cifra que se lee como cifra: display, tracking negativo y **tabular**,
 * para que una columna de números no baile al cambiar de valor.
 *
 * Se usa en analítica, en los contadores de Hoy y en las fracciones tipo
 * "7/12". Antes cada sitio ponía su `text-2xl font-semibold` y salían cinco
 * tamaños distintos para decir lo mismo.
 */
export function Figure({
  children,
  size = 26,
  tone,
  style,
  ...rest
}: { size?: number; tone?: string } & TextProps) {
  const c = useThemeColors();
  return (
    <Text
      className="font-display"
      style={[
        {
          fontSize: size,
          lineHeight: size + 2,
          letterSpacing: -0.8,
          color: tone ?? c.text,
          fontVariant: ["tabular-nums"],
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}
