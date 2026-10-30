import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Cabecera de sección plegable. Título en display a 20 px; los conteos van en
 * una **segunda línea** (`meta`, versalitas) y nunca en la línea del título,
 * que es lo que acababa produciendo "Done toda…" en Today.
 *
 * `trailing` es para un conteo o una acción a la derecha (Tasks: "2"). No hay
 * `children` arbitrarios a propósito.
 */
export function SectionHeader({
  title,
  meta,
  icon,
  open,
  onToggle,
  trailing,
  tone = "default",
}: {
  title: string;
  meta?: ReactNode;
  icon?: ReactNode;
  open: boolean;
  onToggle: () => void;
  trailing?: ReactNode;
  /** `signal` pinta el título en rojo (bucket "Overdue"). */
  tone?: "default" | "signal";
}) {
  const c = useThemeColors();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={title}
      className="flex-row items-center gap-2 active:opacity-70"
      style={{ minHeight: SIZE.hit, paddingVertical: 6 }}
    >
      {/* Rotación por style, no por className alternante (regla 4). */}
      <View style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}>
        <ChevronRight size={18} color={c.text3} />
      </View>
      {icon}
      <View className="min-w-0 flex-1">
        <Text
          className="font-display"
          style={{
            fontSize: 20,
            lineHeight: 24,
            letterSpacing: -0.4,
            color: tone === "signal" ? c.signal : c.text,
          }}
        >
          {title}
        </Text>
        {meta ? (
          <Text
            className="font-sans-semibold uppercase"
            style={{ fontSize: 12, letterSpacing: 0.6, color: c.text3, marginTop: 2 }}
          >
            {meta}
          </Text>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  );
}
