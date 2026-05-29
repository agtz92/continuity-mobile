import { Text, View } from "react-native";

// Temporary screen body for Phase 1 — real views land in later phases.
export function Placeholder({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-bg p-6">
      <Text className="text-2xl font-bold text-text">{title}</Text>
      {subtitle ? (
        <Text className="text-center text-text-muted">{subtitle}</Text>
      ) : null}
    </View>
  );
}
