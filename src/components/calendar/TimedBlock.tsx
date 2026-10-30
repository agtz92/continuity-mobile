import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { Repeat } from "lucide-react-native";

import { alpha, type ThemeColors } from "@/theme/useThemeColors";
import type { TimedEntry } from "./entries";

export const HOUR_PX = 60;
export const MIN_BLOCK = 48;

/**
 * Un bloque con hora en la cuadrícula del Día. Usa `minHeight`, no `height`:
 * si el título envuelve a dos líneas, el bloque crece en vez de cortarlo.
 * Espina de 3 px del color de la categoría; las rutinas van en `accent`.
 */
export const TimedBlock = memo(function TimedBlock({
  entry,
  top,
  left,
  width,
  colors: c,
  onPress,
}: {
  entry: TimedEntry;
  top: number;
  /** Posición horizontal en % del área de eventos (columnas por solape). */
  left: string;
  width: string;
  colors: ThemeColors;
  onPress: (entry: TimedEntry) => void;
}) {
  const routine = entry.kind === "routine";
  return (
    <View
      style={{
        position: "absolute",
        top,
        left: left as `${number}%`,
        width: width as `${number}%`,
        paddingLeft: 8,
        paddingRight: 4,
      }}
    >
      <Pressable
        onPress={() => onPress(entry)}
        accessibilityRole="button"
        accessibilityLabel={`${entry.title}, ${entry.meta}`}
        className="active:opacity-70"
        style={{
          minHeight: Math.max(MIN_BLOCK, (entry.minutes / 60) * HOUR_PX - 4),
          borderRadius: 6,
          borderWidth: 1,
          borderColor: routine ? alpha(c.accent, 0.3) : c.border,
          borderLeftWidth: 3,
          borderLeftColor: entry.spine,
          backgroundColor: routine ? alpha(c.accent, 0.1) : c.surface,
          paddingVertical: 7,
          paddingHorizontal: 10,
          // Completada: tachado y 0.85 — nunca bajo 0.78, se volvería ilegible.
          opacity: entry.completed ? 0.85 : 1,
        }}
      >
        <View className="flex-row items-start" style={{ gap: 6 }}>
          <Text
            numberOfLines={2}
            className="min-w-0 flex-1 font-sans-medium"
            style={{
              fontSize: 15,
              lineHeight: 20,
              color: routine ? c.accent : c.text,
              textDecorationLine: entry.completed ? "line-through" : "none",
            }}
          >
            {entry.title}
          </Text>
          {routine ? <Repeat size={13} color={c.accent} style={{ marginTop: 3 }} /> : null}
        </View>
        <Text
          numberOfLines={1}
          className="font-sans-semibold uppercase"
          style={{ fontSize: 11, letterSpacing: 1, color: c.text3, marginTop: 2 }}
        >
          {entry.meta}
        </Text>
      </Pressable>
    </View>
  );
});
