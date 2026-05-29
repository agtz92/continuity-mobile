import type { ReactNode } from "react";
import { Text, View } from "react-native";

/** Labeled form field: a small uppercase label above its control. */
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-medium uppercase tracking-wider text-text-muted">
        {label}
      </Text>
      {children}
    </View>
  );
}
