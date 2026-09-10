import { Text, View } from "react-native";
import { ScreenTitle } from "@/components/ui/ScreenTitle";

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
      <ScreenTitle>{title}</ScreenTitle>
      {subtitle ? (
        <Text className="text-center text-text-muted">{subtitle}</Text>
      ) : null}
    </View>
  );
}
