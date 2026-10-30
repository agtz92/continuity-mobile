import { memo } from "react";
import { Pressable, Text, View } from "react-native";

import type { LoadLevel } from "@/lib/calendar";
import { alpha, type ThemeColors } from "@/theme/useThemeColors";

const MAX_BARS = 3;
export const CELL_H = 60;

/**
 * Un día de la matriz del Mes. Sin tarjeta: lo separa la regla superior (de
 * 3 px en `signal` si el día está sobrecargado). La carga se dice con peso
 * (busy = 700) y con la regla, no solo con color. Toda la celda es el botón.
 */
export const MonthCell = memo(
  function MonthCell({
    iso,
    day,
    inMonth,
    isToday,
    selected,
    level,
    bars,
    colors: c,
    onPick,
    accessibilityLabel,
  }: {
    iso: string;
    day: number;
    inMonth: boolean;
    isToday: boolean;
    selected: boolean;
    /** Nivel de carga, o `null` si la carga está apagada. */
    level: LoadLevel | null;
    /** Un color por ítem (categoría; rutinas en accent). */
    bars: string[];
    colors: ThemeColors;
    onPick: (iso: string) => void;
    accessibilityLabel: string;
  }) {
    const over = inMonth && level === "over";
    const heavy = inMonth && (level === "over" || level === "busy");
    const shown = inMonth ? bars.slice(0, MAX_BARS) : [];
    const extra = inMonth ? bars.length - shown.length : 0;
    return (
      <Pressable
        onPress={() => onPick(iso)}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={accessibilityLabel}
        className="flex-1 items-center"
        style={{
          height: CELL_H,
          borderTopWidth: over ? 3 : 1,
          borderTopColor: over ? c.signal : c.line[14],
          backgroundColor: selected ? alpha(c.accent, 0.08) : "transparent",
          paddingTop: over ? 3 : 5,
        }}
      >
        {selected ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderWidth: 2,
              borderColor: c.accent,
            }}
          />
        ) : null}
        <View
          className="items-center justify-center"
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: isToday ? c.accent : "transparent",
          }}
        >
          <Text
            className={isToday || heavy ? "font-sans-bold" : "font-sans-medium"}
            style={{
              fontSize: 15,
              fontVariant: ["tabular-nums"],
              color: isToday ? c.bg : !inMonth ? c.text5 : over ? c.signal : c.text,
            }}
          >
            {day}
          </Text>
        </View>
        <View className="w-full" style={{ paddingHorizontal: 3, gap: 2, marginTop: 3 }}>
          {shown.map((color, i) => (
            <View key={i} style={{ height: 3, backgroundColor: color }} />
          ))}
          {extra > 0 ? (
            <Text
              className="text-center font-sans-semibold"
              style={{ fontSize: 10, lineHeight: 11, color: c.text2 }}
            >
              +{extra}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  },
  (a, b) =>
    a.iso === b.iso &&
    a.selected === b.selected &&
    a.level === b.level &&
    a.isToday === b.isToday &&
    a.colors === b.colors &&
    a.onPick === b.onPick &&
    a.accessibilityLabel === b.accessibilityLabel &&
    a.bars.length === b.bars.length &&
    a.bars.every((x, i) => x === b.bars[i]),
);
