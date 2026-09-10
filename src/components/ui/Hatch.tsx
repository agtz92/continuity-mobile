import { StyleSheet, View, type ViewProps } from "react-native";
import Svg, { Defs, Line, Pattern, Rect } from "react-native-svg";

/**
 * Trama diagonal de fondo.
 *
 * El canvas la dibuja con `repeating-linear-gradient`, que **no existe en React
 * Native**. La solución sale de `react-native-svg`, que ya era dependencia
 * directa del proyecto (lo trae `lucide-react-native`), así que no se añade
 * nada: un `<Pattern>` con una línea a 45° y un `<Rect>` que lo rellena.
 *
 * Se descartó el PNG tileable por un motivo concreto: no se puede teñir con el
 * color del tema sin duplicar el asset una vez por tema.
 *
 * Por qué existe: **un blocker tiene que distinguirse en una captura en escala
 * de grises**. El coral es refuerzo; la trama y el ✕ son la señal.
 */
export function Hatch({
  color,
  /** Distancia entre líneas. 7 lee como trama; menos, como bloque sucio. */
  gap = 7,
  thickness = 1.5,
  opacity = 1,
  children,
  style,
  ...rest
}: {
  color: string;
  gap?: number;
  thickness?: number;
  opacity?: number;
} & ViewProps) {
  // Un id estable por geometría: dos tramas distintas en la misma pantalla no
  // pueden compartir patrón, y regenerarlo en cada render tira el reciclado.
  const id = `hatch-${gap}-${thickness}`;

  return (
    <View style={style} {...rest}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%" opacity={opacity}>
          <Defs>
            <Pattern
              id={id}
              patternUnits="userSpaceOnUse"
              width={gap}
              height={gap}
              patternTransform="rotate(45)"
            >
              <Line
                x1="0"
                y1="0"
                x2="0"
                y2={gap}
                stroke={color}
                strokeWidth={thickness}
              />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      </View>
      {children}
    </View>
  );
}
