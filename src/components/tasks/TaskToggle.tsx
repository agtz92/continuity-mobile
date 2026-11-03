import { Pressable, View } from "react-native";
import Animated, { useAnimatedProps, useAnimatedStyle } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { Lock, Repeat } from "lucide-react-native";
import { useThemeColors } from "@/theme/useThemeColors";
import { out2, out3, span, useCue } from "./cue";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Palomita invertida: nace del trazo corto. Su largo en el viewBox de 24. */
const CHECK_PATH = "M4 12l5 5L20 6";
const CHECK_LEN = 22.63;

/**
 * Circular completion toggle shared by every task/routine row (mirror of the
 * web `tasks/TaskToggle.tsx`). Replaces the old 18px muted CheckCircle2 icon,
 * which read as decoration rather than a control: an empty ring reads as
 * "fill me in", and the done state fills with the theme accent plus a check.
 *
 * Rediseño "Breathe": el anillo pasa de 24 a 28 px; con `hitSlop` el blanco
 * de toque efectivo es 44 (24 px en la semana del calendario).
 *
 * Cue "Trazo" (ver `cue.ts`): el anillo pasa a `accent` en el frame 0, la
 * tinta crece dentro (el control no escala) y la palomita se dibuja.
 * Desmarcar solo baja la opacidad.
 *
 * - kind "task": solid ring; turns `signal` while overdue, lock when blocked.
 * - kind "routine": dashed ring with a Repeat glyph ("this one recurs").
 */
export function TaskToggle({
  done,
  overdue = false,
  blocked = false,
  kind = "task",
  size = 28,
  onToggle,
  label,
}: {
  done: boolean;
  overdue?: boolean;
  blocked?: boolean;
  kind?: "task" | "routine";
  size?: 28 | 24;
  onToggle: () => void;
  label: string;
}) {
  const c = useThemeColors();
  const { clock, shown } = useCue(done);
  const small = size === 24;
  const discMs = small ? 120 : 140;
  const drawStart = small ? 50 : 60;
  const drawMs = small ? 140 : 160;
  const checkSize = small ? 13 : 16;

  const discStyle = useAnimatedStyle(() => {
    const p = out3(span(clock.value, 0, discMs));
    return { opacity: p * shown.value, transform: [{ scale: 0.4 + 0.6 * p }] };
  });
  const checkStyle = useAnimatedStyle(() => ({ opacity: shown.value }));
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LEN * (1 - out2(span(clock.value, drawStart, drawMs))),
  }));
  const glyphStyle = useAnimatedStyle(() => ({
    opacity: 1 - shown.value * span(clock.value, 0, 80),
  }));

  const fill = {
    position: "absolute" as const,
    top: -2,
    left: -2,
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ checked: done }}
      hitSlop={small ? 10 : 8}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: done ? c.accent : overdue ? c.signal : c.line[34],
          borderStyle: kind === "routine" && !done ? "dashed" : "solid",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {blocked || kind === "routine" ? (
          <Animated.View style={glyphStyle}>
            {blocked ? (
              <Lock size={13} color={c.text5} />
            ) : (
              <Repeat size={13} color={c.text5} />
            )}
          </Animated.View>
        ) : null}
        <Animated.View
          pointerEvents="none"
          style={[fill, { backgroundColor: c.accent }, discStyle]}
        />
        <Animated.View pointerEvents="none" style={[fill, checkStyle]}>
          <Svg width={checkSize} height={checkSize} viewBox="0 0 24 24" fill="none">
            <AnimatedPath
              d={CHECK_PATH}
              stroke={c.bg}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={CHECK_LEN}
              animatedProps={checkProps}
            />
          </Svg>
        </Animated.View>
      </View>
    </Pressable>
  );
}
