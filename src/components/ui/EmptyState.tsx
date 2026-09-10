import { Text, View } from "react-native";
import type { ReactNode } from "react";

import { useThemeColors } from "@/theme/useThemeColors";
import { Meta } from "./Meta";

/**
 * Estado vacío con voz de marca: regla de 3px arriba, titular en display y un
 * cuerpo que dice algo. **Sin ilustración de stock** — el sistema no tiene
 * ilustración, y un vacío con dibujo se lee como error de otra app.
 *
 * `rule` es el metadato opcional del pie: un dato honesto, no un consejo.
 */
export function EmptyState({
  title,
  body,
  actions,
  rule,
}: {
  title: string;
  body?: string;
  actions?: ReactNode;
  rule?: string;
}) {
  const c = useThemeColors();
  return (
    <View style={{ paddingVertical: 40 }}>
      <View style={{ width: 44, height: 3, backgroundColor: c.accent }} />
      <Text
        className="mt-5 font-display text-text"
        style={{ fontSize: 28, lineHeight: 30, letterSpacing: -0.8 }}
      >
        {title}
      </Text>
      {body ? (
        <Text className="font-sans mt-3 text-base text-text-3">{body}</Text>
      ) : null}
      {actions ? (
        <View className="mt-5 flex-row flex-wrap items-center gap-3">
          {actions}
        </View>
      ) : null}
      {rule ? (
        <Meta variant="cintillo" tone="faint" className="mt-7">
          {rule}
        </Meta>
      ) : null}
    </View>
  );
}
