import { useState } from "react";
import { View, type TextLayoutLine } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { useThemeColors } from "@/theme/useThemeColors";
import { out2, span, useCue } from "./cue";

type Line = Pick<TextLayoutLine, "x" | "y" | "width" | "height">;

/**
 * Título de tarea/rutina que se tacha **línea por línea** al completar.
 * `textDecorationLine` no se anima, así que cada línea (de `onTextLayout`)
 * lleva su barra absoluta de `text5` a 55 % de su alto, que crece desde la
 * izquierda. La tinta va de `color` a `text5` en 220 ms. Envuelve siempre:
 * nunca `numberOfLines`.
 *
 * `compact` es la fila del calendario: una sola pasada (80–240 ms) y barra
 * de 1 px.
 */
export function StrikeTitle({
  done,
  children,
  color,
  fontSize,
  lineHeight,
  compact = false,
}: {
  done: boolean;
  children: string;
  color: string;
  fontSize: number;
  lineHeight: number;
  compact?: boolean;
}) {
  const c = useThemeColors();
  const { clock, shown, ink } = useCue(done);
  const [lines, setLines] = useState<Line[]>([]);
  const doneColor = c.text5;

  const inkStyle = useAnimatedStyle(() => ({
    color: interpolateColor(ink.value, [0, 1], [color, doneColor]),
  }));

  return (
    <View>
      <Animated.Text
        style={[{ fontFamily: "SchibstedGrotesk_400Regular", fontSize, lineHeight }, inkStyle]}
        onTextLayout={(e) =>
          setLines(e.nativeEvent.lines.map(({ x, y, width, height }) => ({ x, y, width, height })))
        }
      >
        {children}
      </Animated.Text>
      {lines.map((line, i) => (
        <StrikeBar
          key={i}
          line={line}
          index={i}
          compact={compact}
          clock={clock}
          shown={shown}
          color={doneColor}
        />
      ))}
    </View>
  );
}

function StrikeBar({
  line,
  index,
  compact,
  clock,
  shown,
  color,
}: {
  line: Line;
  index: number;
  compact: boolean;
  clock: SharedValue<number>;
  shown: SharedValue<number>;
  color: string;
}) {
  const thickness = compact ? 1 : 1.5;
  // De la 4ª línea en adelante se usa el retardo de la 3ª.
  const start = compact ? 80 : 90 + 50 * Math.min(index, 2);
  const dur = compact ? 160 : 180;

  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ scaleX: out2(span(clock.value, start, dur)) }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: line.x,
          top: line.y + line.height * 0.55 - thickness / 2,
          width: line.width,
          height: thickness,
          backgroundColor: color,
          transformOrigin: "left",
        },
        style,
      ]}
    />
  );
}
