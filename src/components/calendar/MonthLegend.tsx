import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import type { ThemeColors } from "@/theme/useThemeColors";

/** Leyenda bajo la matriz del Mes. Sin carga, solo queda la de las barras. */
export function MonthLegend({
  showLoad,
  sampleBar,
  colors: c,
}: {
  showLoad: boolean;
  /** Color de muestra para "una barra = un ítem". */
  sampleBar: string;
  colors: ThemeColors;
}) {
  const { t } = useTranslation();
  const label = { fontSize: 11, letterSpacing: 0.8, color: c.text3 } as const;
  const bar = (color: string) => <View style={{ width: 14, height: 3, backgroundColor: color }} />;
  return (
    <View className="flex-row flex-wrap" style={{ paddingTop: 10, paddingBottom: 4, rowGap: 6, columnGap: 14 }}>
      {showLoad ? (
        <>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            {bar(c.signal)}
            <Text className="font-sans-semibold uppercase" style={label}>
              {t("views.calendar.legend.over")}
            </Text>
          </View>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Text className="font-sans-bold" style={{ fontSize: 13, color: c.text }}>
              29
            </Text>
            <Text className="font-sans-semibold uppercase" style={label}>
              {t("views.calendar.legend.busy")}
            </Text>
          </View>
        </>
      ) : null}
      <View className="flex-row items-center" style={{ gap: 6 }}>
        {bar(sampleBar)}
        <Text className="font-sans-semibold uppercase" style={label}>
          {t("views.calendar.legend.bar")}
        </Text>
      </View>
    </View>
  );
}
