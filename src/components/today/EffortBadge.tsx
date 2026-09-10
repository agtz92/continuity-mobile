import { View } from "react-native";
import { Clock } from "lucide-react-native";
import { useThemeColors } from "@/theme/useThemeColors";
import { Meta } from "@/components/ui/Meta";

/**
 * Horas de esfuerzo: **metadato, no señal**.
 *
 * Antes era una pastilla con el segundo color de acento, y competía por
 * atención con los badges de "vencida" y "hoy" que viven en la misma fila. El
 * sistema solo tiene tres voces —`signal`, `accent`, `closed`— y "2h" no es
 * ninguna: es un dato, y los datos van en `<Meta>` con tinta apagada.
 *
 * El reloj se queda porque es lo que hace que se lea sin leer: la cifra sola
 * junto a otra cifra no dice qué mide.
 */
export function EffortBadge({ hours }: { hours: number }) {
  const c = useThemeColors();
  return (
    <View className="flex-row items-center gap-1">
      <Clock size={10} color={c.text5} />
      <Meta tone="faint">{`${hours}h`}</Meta>
    </View>
  );
}
