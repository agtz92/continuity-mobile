import { Pressable, Text, View } from "react-native";
import { RotateCcw, X } from "lucide-react-native";
import { useThemeColors } from "@/theme/useThemeColors";

export function TodayCustomizeBar({
  onExit,
  onReset,
  labels,
}: {
  onExit: () => void;
  onReset: () => void;
  labels: { title: string; close: string; reset: string; done: string };
}) {
  const c = useThemeColors();
  return (
    <View
      className="flex-row items-center gap-3 border-b px-4 py-3"
      style={{ backgroundColor: c.bg, borderColor: c.border }}
    >
      <Pressable
        onPress={onExit}
        accessibilityRole="button"
        accessibilityLabel={labels.close}
        hitSlop={8}
        className="rounded-md p-1.5"
      >
        <X size={20} color={c.textMuted} />
      </Pressable>
      <Text className="flex-1 text-base font-semibold text-text" numberOfLines={1}>
        {labels.title}
      </Text>
      <Pressable
        onPress={onReset}
        accessibilityRole="button"
        accessibilityLabel={labels.reset}
        hitSlop={8}
        className="flex-row items-center gap-1.5 rounded-md border px-3 py-1.5"
        style={{ backgroundColor: c.surface, borderColor: c.border }}
      >
        <RotateCcw size={14} color={c.textMuted} />
        <Text className="text-sm text-text-muted">{labels.reset}</Text>
      </Pressable>
      <Pressable
        onPress={onExit}
        accessibilityRole="button"
        className="rounded-md px-4 py-1.5"
        style={{ backgroundColor: c.accent }}
      >
        <Text className="text-sm font-medium" style={{ color: c.bg }}>
          {labels.done}
        </Text>
      </Pressable>
    </View>
  );
}
