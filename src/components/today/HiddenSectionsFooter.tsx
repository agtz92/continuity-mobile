import { Pressable, Text, View } from "react-native";
import { EyeOff } from "lucide-react-native";
import { useThemeColors } from "@/theme/useThemeColors";

export function HiddenSectionsFooter({
  count,
  onCustomize,
  label,
}: {
  count: number;
  onCustomize: () => void;
  label: string;
}) {
  const c = useThemeColors();
  if (count === 0) return null;
  return (
    <Pressable
      onPress={onCustomize}
      accessibilityRole="button"
      className="flex-row items-center justify-center gap-2 border-t py-3"
      style={{ borderColor: c.border, borderStyle: "dashed" }}
    >
      <EyeOff size={14} color={c.textMuted} />
      <Text className="text-sm text-text-muted">{label}</Text>
    </Pressable>
  );
}
