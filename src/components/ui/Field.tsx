import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Campo de formulario: etiqueta en versalitas de 11 px sobre su control.
 * `aside` va a la derecha de la etiqueta — el valor actual cuando el control
 * son presets (la fecha "Mon, Oct 26 · 3 days late", el esfuerzo "2 hours"),
 * en `signal` si `asideTone="signal"`.
 */
export function Field({
  label,
  aside,
  asideTone = "muted",
  children,
}: {
  label: string;
  aside?: string | null;
  asideTone?: "muted" | "signal";
  children: ReactNode;
}) {
  const c = useThemeColors();
  return (
    <View style={{ gap: 8 }}>
      <View className="flex-row items-baseline justify-between gap-3">
        <Text
          className="font-sans-semibold uppercase"
          style={{ fontSize: 11, letterSpacing: 0.8, color: c.text3 }}
        >
          {label}
        </Text>
        {aside ? (
          <Text
            className="min-w-0 flex-shrink font-sans-medium"
            style={{ fontSize: 14, color: asideTone === "signal" ? c.signal : c.text2 }}
          >
            {aside}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}
