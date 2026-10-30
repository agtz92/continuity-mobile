import { View } from "react-native";

import { Meta } from "@/components/ui/Meta";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Cintillo de grupo en las listas de "More" ("PINNED ——", "TODAY · 6 ——"):
 * versalitas 11 + filete que llena el resto de la línea. `accent` marca el
 * grupo que pide atención (fijadas, hoy).
 */
export function SectionCintillo({
  label,
  count,
  accent = false,
}: {
  label: string;
  count?: number;
  accent?: boolean;
}) {
  const c = useThemeColors();
  return (
    <View
      accessibilityRole="header"
      className="flex-row items-center"
      style={{ gap: 12, paddingTop: 24, paddingBottom: 6 }}
    >
      <Meta variant="cintillo" tone="inherit" style={{ color: accent ? c.accent : c.text3 }}>
        {count != null ? `${label} · ${count}` : label}
      </Meta>
      <View style={{ flex: 1, height: 1, backgroundColor: c.line[14] }} />
    </View>
  );
}
