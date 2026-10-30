import { Text, View } from "react-native";

import { isSameMonth, type LoadLevel } from "@/lib/calendar";
import type { ThemeColors } from "@/theme/useThemeColors";
import { MonthCell } from "./MonthCell";

/**
 * Matriz del Mes. Las barras y la carga de cada día llegan ya calculadas
 * (`barsByDay`, `levelByDay`, un `useMemo` por mes en la pantalla): antes cada
 * celda recalculaba el rollup por proyecto en cada render.
 */
export function MonthGrid({
  weeks,
  refDate,
  todayISO,
  selectedISO,
  weekdayLetters,
  barsByDay,
  levelByDay,
  dayLabel,
  colors: c,
  onPickDay,
}: {
  weeks: string[][];
  refDate: Date;
  todayISO: string;
  selectedISO: string;
  /** Una letra por día: M T W T F S S. */
  weekdayLetters: string[];
  barsByDay: Map<string, string[]>;
  /** `null` cuando la carga está apagada. */
  levelByDay: Map<string, LoadLevel> | null;
  /** Etiqueta accesible de la celda ("Thursday 29, 5 items"). */
  dayLabel: (iso: string) => string;
  colors: ThemeColors;
  onPickDay: (iso: string) => void;
}) {
  return (
    <View>
      <View className="flex-row" style={{ paddingBottom: 6 }}>
        {weekdayLetters.map((w, i) => (
          <Text
            key={i}
            className="flex-1 text-center font-sans-semibold uppercase"
            style={{ fontSize: 11, letterSpacing: 1.2, color: c.text3 }}
          >
            {w}
          </Text>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0]} className="flex-row">
          {week.map((iso) => (
            <MonthCell
              key={iso}
              iso={iso}
              day={Number(iso.slice(8, 10))}
              inMonth={isSameMonth(iso, refDate)}
              isToday={iso === todayISO}
              selected={iso === selectedISO}
              level={levelByDay?.get(iso) ?? null}
              bars={barsByDay.get(iso) ?? EMPTY}
              colors={c}
              onPick={onPickDay}
              accessibilityLabel={dayLabel(iso)}
            />
          ))}
        </View>
      ))}
      <View style={{ height: 1, backgroundColor: c.line[14] }} />
    </View>
  );
}

const EMPTY: string[] = [];
