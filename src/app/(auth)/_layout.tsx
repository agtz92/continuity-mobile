import { Stack } from "expo-router";
import { useThemeColors } from "@/theme/useThemeColors";

export default function AuthLayout() {
  const c = useThemeColors();
  // Fondo del tema en el contenedor: sin él, el cambio login ↔ signup deja ver
  // un frame blanco detrás de la transición en los temas oscuros.
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />;
}
