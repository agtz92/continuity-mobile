import Animated, {
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

/**
 * Badge de estado de fila ("VENCIDA · 3 D", "HOY") que se apaga con la tinta
 * del cue: texto tono → `text5`, fondo tono 14 % → transparente, borde tono
 * 35 % → `line[14]`.
 */
export function InkBadge({
  label,
  tone,
  ink,
}: {
  label: string;
  tone: string;
  ink: SharedValue<number>;
}) {
  const c = useThemeColors();
  const bgFrom = alpha(tone, 0.14);
  const bgTo = alpha(tone, 0);
  const borderFrom = alpha(tone, 0.35);
  const borderTo = c.line[14];
  const textTo = c.text5;

  const box = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(ink.value, [0, 1], [bgFrom, bgTo]),
    borderColor: interpolateColor(ink.value, [0, 1], [borderFrom, borderTo]),
  }));
  const text = useAnimatedStyle(() => ({
    color: interpolateColor(ink.value, [0, 1], [tone, textTo]),
  }));

  return (
    <Animated.View
      style={[{ borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 }, box]}
    >
      <Animated.Text
        style={[
          {
            fontFamily: "SchibstedGrotesk_600SemiBold",
            fontSize: 11,
            letterSpacing: 0.6,
            textTransform: "uppercase",
          },
          text,
        ]}
      >
        {label}
      </Animated.Text>
    </Animated.View>
  );
}
