import { memo } from "react";
import { Pressable, Text, View } from "react-native";

import { selectionFeedback } from "@/lib/feedback";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

export type SegmentedOption<V extends string> = { value: V; label: string };

/**
 * Control segmentado de 44 px (radio 8, padding 3; el activo radio 5 con
 * fondo `accent`). Sustituye a los segmentados distintos que había en Tasks,
 * Calendar, Analytics y el formulario de proyecto.
 */
function SegmentedInner<V extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<SegmentedOption<V>>;
  value: V;
  onChange: (next: V) => void;
}) {
  const c = useThemeColors();
  return (
    <View
      accessibilityRole="tablist"
      className="flex-row"
      style={{
        height: SIZE.hit,
        padding: 3,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: c.line[18],
        backgroundColor: c.surface,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              if (active) return;
              selectionFeedback();
              onChange(o.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
            className="flex-1 items-center justify-center"
            style={{ borderRadius: 5, backgroundColor: active ? c.accent : "transparent" }}
          >
            {/* Etiqueta de control, no título: aquí sí se permite elipsar. */}
            <Text
              numberOfLines={1}
              className={active ? "font-sans-semibold" : "font-sans-medium"}
              style={{ fontSize: 14, color: active ? c.bg : c.text3 }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const Segmented = memo(SegmentedInner) as typeof SegmentedInner;
