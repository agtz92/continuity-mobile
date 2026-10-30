import { Pressable, Text, View } from "react-native";
import { RotateCcw, X } from "lucide-react-native";

import { IconAction } from "@/components/ui/IconAction";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

/** Barra del editor de layout de Hoy: cerrar, título, restablecer y listo (44 px). */
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
      className="flex-row items-center gap-2 px-2 py-1.5"
      style={{ backgroundColor: c.bg, borderBottomWidth: 1, borderBottomColor: c.line[14] }}
    >
      <IconAction icon={X} label={labels.close} onPress={onExit} />
      <Text
        className="min-w-0 flex-1 font-display"
        style={{ fontSize: 20, letterSpacing: -0.4, color: c.text }}
      >
        {labels.title}
      </Text>
      <Pressable
        onPress={onReset}
        accessibilityRole="button"
        accessibilityLabel={labels.reset}
        className="flex-row items-center gap-1.5 rounded-md px-3 active:opacity-70"
        style={{ height: SIZE.hit, borderWidth: 1, borderColor: c.line[18], backgroundColor: c.surface }}
      >
        <RotateCcw size={16} color={c.text3} />
        <Text className="font-sans" style={{ fontSize: 14, color: c.text2 }}>
          {labels.reset}
        </Text>
      </Pressable>
      <Pressable
        onPress={onExit}
        accessibilityRole="button"
        className="items-center justify-center rounded-md px-4 active:opacity-80"
        style={{ height: SIZE.hit, backgroundColor: c.accent }}
      >
        <Text className="font-sans-semibold" style={{ fontSize: 15, color: c.bg }}>
          {labels.done}
        </Text>
      </Pressable>
    </View>
  );
}
