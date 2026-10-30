import { memo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { selectionFeedback } from "@/lib/feedback";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

export type FilterChipItem<K extends string> = {
  key: K;
  label: string;
  count?: number;
  /** Color de categoría: barra de 3 px antes de la etiqueta. */
  dot?: string;
};

/**
 * Cinta horizontal de filtros: rectángulos de 36 px en versalitas, radio 6.
 * Activo = fondo `accent`, texto `bg`. Sustituye a las cuatro implementaciones
 * que había (Projects, Notes, Log, Analytics).
 */
function FilterChipsInner<K extends string>({
  items,
  value,
  onChange,
}: {
  items: ReadonlyArray<FilterChipItem<K>>;
  value: K;
  onChange: (key: K) => void;
}) {
  const c = useThemeColors();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingRight: 8 }}
    >
      {items.map((it) => {
        const active = it.key === value;
        return (
          <Pressable
            key={it.key}
            onPress={() => {
              if (active) return;
              selectionFeedback();
              onChange(it.key);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={it.count != null ? `${it.label} ${it.count}` : it.label}
            className="flex-row items-center"
            style={{
              height: SIZE.filterChip,
              paddingHorizontal: 12,
              borderRadius: 6,
              gap: 6,
              borderWidth: 1,
              borderColor: active ? c.accent : c.line[18],
              backgroundColor: active ? c.accent : c.surface,
            }}
          >
            {it.dot ? (
              <View style={{ width: 3, height: 12, borderRadius: 1, backgroundColor: it.dot }} />
            ) : null}
            <Text
              className="font-sans-semibold uppercase"
              style={{ fontSize: 11, letterSpacing: 0.8, color: active ? c.bg : c.text3 }}
            >
              {it.label}
              {it.count != null ? ` ${it.count}` : ""}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export const FilterChips = memo(FilterChipsInner) as typeof FilterChipsInner;
