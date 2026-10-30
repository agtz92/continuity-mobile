import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { Check, type LucideIcon } from "lucide-react-native";

import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Fila de menú dentro de un `BottomSheet` (⋯, rango, filtros): 46 px, icono
 * 18, texto 16. `tone="signal"` para borrar; `selected` pinta una palomita a
 * la derecha (hojas de elección única, p. ej. el rango de Analytics).
 *
 * Vive aquí y no en `ui/` porque las primitivas compartidas no se tocan en
 * esta fase; si otra área la necesita, se promueve.
 */
export const SheetRow = memo(function SheetRow({
  icon: Icon,
  label,
  onPress,
  tone = "text",
  selected,
  disabled = false,
}: {
  icon?: LucideIcon;
  label: string;
  onPress: () => void;
  tone?: "text" | "signal";
  selected?: boolean;
  disabled?: boolean;
}) {
  const c = useThemeColors();
  const color = tone === "signal" ? c.signal : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: !!selected }}
      className="flex-row items-center active:opacity-60"
      style={[
        { minHeight: 46, gap: 12, borderBottomWidth: 1, borderBottomColor: c.line[14] },
        disabled ? { opacity: 0.4 } : null,
      ]}
    >
      {Icon ? <Icon size={18} color={tone === "signal" ? c.signal : c.text3} /> : null}
      <Text className="font-sans flex-1" style={{ fontSize: 16, color }}>
        {label}
      </Text>
      {selected ? <Check size={18} color={c.accent} /> : <View style={{ width: 18 }} />}
    </Pressable>
  );
});
