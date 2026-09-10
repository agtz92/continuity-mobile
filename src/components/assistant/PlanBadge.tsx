import { Text, View } from "react-native";
import {
  Crown,
  Gem,
  Sparkle,
  Star,
  type LucideIcon,
} from "lucide-react-native";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

type Plan = "free" | "pro" | "studio" | "admin";


/**
 * Chip de plan junto al título del asistente.
 *
 * Antes Studio y Admin tenían morado y ámbar fijos "para que sigan siendo
 * distintos entre paletas". No hacía falta: **el icono ya los distingue**
 * (chispa, estrella, gema, corona), y dos colores ajenos al tema en un chip de
 * 10px no separan nada — solo desentonan. Ahora la escala es de intensidad, que
 * es lo que un tier significa: apagado, acento, acento sólido.
 */
export function PlanBadge({ plan }: { plan: Plan }) {
  const c = useThemeColors();
  const styles: Record<
    Plan,
    { label: string; Icon: LucideIcon; color: string; bg: string; border: string }
  > = {
    free: {
      label: "Free",
      Icon: Sparkle,
      color: c.textMuted,
      bg: alpha(c.surface, 0.6),
      border: c.border,
    },
    pro: {
      label: "Pro",
      Icon: Star,
      color: c.accent,
      bg: alpha(c.accent, 0.1),
      border: alpha(c.accent, 0.4),
    },
    studio: {
      label: "Studio",
      Icon: Gem,
      color: c.accent,
      bg: alpha(c.accent, 0.18),
      border: alpha(c.accent, 0.6),
    },
    admin: {
      label: "Admin",
      Icon: Crown,
      color: c.bg,
      bg: c.accent,
      border: c.accent,
    },
  };
  const st = styles[plan] ?? styles.free;
  const Icon = st.Icon;
  return (
    <View
      className="flex-row items-center gap-1 rounded-md border px-1.5 py-0.5"
      style={{ backgroundColor: st.bg, borderColor: st.border }}
    >
      <Icon size={10} color={st.color} />
      <Text
        className="text-[10px] font-sans-semibold uppercase"
        style={{ color: st.color }}
      >
        {st.label}
      </Text>
    </View>
  );
}
