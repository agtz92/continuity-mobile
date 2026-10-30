import { Pressable, Text } from "react-native";
import { EyeOff } from "lucide-react-native";

import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

/** Pie "5 hidden · Customize": 14 px y 44 de alto, bajo una regla punteada. */
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
      className="flex-row items-center justify-center gap-2 active:opacity-70"
      style={{
        minHeight: SIZE.hit,
        borderTopWidth: 1,
        borderColor: c.line[18],
        borderStyle: "dashed",
      }}
    >
      <EyeOff size={16} color={c.text3} />
      <Text className="font-sans" style={{ fontSize: 14, color: c.text3 }}>
        {label}
      </Text>
    </Pressable>
  );
}
