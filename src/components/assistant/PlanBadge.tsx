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

const PURPLE = "168,85,247";
const AMBER = "245,158,11";

/**
 * Small tier chip next to the assistant title. Free/Pro track the theme accent;
 * Studio/Admin use fixed purple/amber so they stay distinct across palettes.
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
      color: "rgb(192,132,252)",
      bg: `rgba(${PURPLE},0.1)`,
      border: `rgba(${PURPLE},0.4)`,
    },
    admin: {
      label: "Admin",
      Icon: Crown,
      color: "rgb(251,191,36)",
      bg: `rgba(${AMBER},0.1)`,
      border: `rgba(${AMBER},0.4)`,
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
        className="text-[10px] font-semibold uppercase"
        style={{ color: st.color }}
      >
        {st.label}
      </Text>
    </View>
  );
}
