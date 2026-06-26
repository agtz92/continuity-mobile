import { View, Text } from "react-native";
import { Clock } from "lucide-react-native";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

/**
 * Badge de horas de esfuerzo (Clock + "{hours}h"), compartido por las secciones
 * de la pantalla Hoy. Extraído del helper `effortBadge` de today.tsx
 * (ver AUDITORIA_CODIGO.md).
 */
export function EffortBadge({ hours }: { hours: number }) {
  const c = useThemeColors();
  return (
    <View
      className="flex-row items-center gap-1 rounded border px-2 py-0.5"
      style={{
        backgroundColor: alpha(c.accent2, 0.15),
        borderColor: alpha(c.accent2, 0.3),
      }}
    >
      <Clock size={10} color={c.accent2} />
      <Text className="text-xs text-accent-2">{hours}h</Text>
    </View>
  );
}
