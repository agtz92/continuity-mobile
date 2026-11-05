import { Pressable, Text } from "react-native";
import { Plus } from "lucide-react-native";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Línea punteada de 48 px con "+ <acción>" que cierra una sección del detalle
 * de proyecto ("New task", "Log update", "New note"). Es el botón que ya tenía
 * Tareas, sacado aquí para que las tres secciones crezcan igual.
 */
export function DashedAddButton({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-row items-center justify-center gap-2 rounded-lg active:opacity-70"
      style={{
        height: 48,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: c.line[34],
      }}
    >
      <Plus size={16} color={c.text3} />
      <Text className="font-sans-medium" style={{ fontSize: 15, color: c.text3 }}>
        {label}
      </Text>
    </Pressable>
  );
}
