import { memo, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { selectionFeedback } from "@/lib/feedback";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

export type PresetOption<V extends string> = {
  value: V;
  label: string;
  /** Barra de color de 3 px (categorías del formulario de proyecto). */
  bar?: string;
  prefix?: ReactNode;
  accessibilityLabel?: string;
};

/**
 * Fila de opciones iguales a 40 px (fecha, esfuerzo, días, categorías).
 * Reemplaza al `Chip` local de task-form y a `ChipGroup`. `cell` dibuja celdas
 * cuadradas que reparten el ancho (días de la semana).
 */
function PresetChipsInner<V extends string>({
  options,
  value,
  onChange,
  cell,
}: {
  options: ReadonlyArray<PresetOption<V>>;
  /** Un valor, varios (multi) o `null` = ninguno activo. */
  value: V | ReadonlyArray<V> | null;
  onChange: (next: V) => void;
  /** Alto de celda cuadrada que reparte el ancho (días de la semana a 44). */
  cell?: number;
}) {
  const c = useThemeColors();
  const multi = Array.isArray(value);
  const isActive = (v: V) =>
    multi ? (value as ReadonlyArray<V>).includes(v) : value === v;
  return (
    <View className={cell ? "flex-row gap-1.5" : "flex-row flex-wrap gap-2"}>
      {options.map((o) => {
        const active = isActive(o.value);
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              selectionFeedback();
              onChange(o.value);
            }}
            accessibilityRole={multi ? "checkbox" : "radio"}
            accessibilityState={multi ? { checked: active } : { selected: active }}
            accessibilityLabel={o.accessibilityLabel ?? o.label}
            className="flex-row items-center justify-center"
            style={[
              {
                height: cell ?? SIZE.chip,
                paddingHorizontal: cell ? 0 : 14,
                borderRadius: 6,
                gap: 6,
                borderWidth: 1,
                borderColor: active ? c.accent : c.line[18],
                backgroundColor: active ? c.accent : c.surface,
              },
              cell ? { flex: 1 } : null,
            ]}
          >
            {o.bar ? (
              <View style={{ width: 3, height: 14, borderRadius: 1, backgroundColor: o.bar }} />
            ) : null}
            {o.prefix}
            <Text
              className="font-sans-medium"
              style={{ fontSize: 14, color: active ? c.bg : c.text2 }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const PresetChips = memo(PresetChipsInner) as typeof PresetChipsInner;
