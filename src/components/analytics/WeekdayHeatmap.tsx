import { Text, View } from "react-native";
import { CalendarDays } from "lucide-react-native";
import type { WeekdayBucket } from "@/lib/types";
import { PanelCard, PURPLE, type T } from "./panels";

/** Heatmap de actividad por día de semana (lun→dom). La intensidad relativa al
 *  máximo modula la opacidad del verde; el suelo de 0.08 deja visibles las celdas en
 *  cero. weekday se asume 1=lunes..7=domingo para alinear con las KEYS. */
export function WeekdayHeatmap({ heatmap, t }: { heatmap: WeekdayBucket[]; t: T }) {
  const KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  const max = Math.max(1, ...heatmap.map((b) => b.count));
  const lookup = new Map(heatmap.map((b) => [b.weekday, b.count] as const));
  return (
    <PanelCard title={t("analytics.weekday.title")} icon={<CalendarDays size={16} color={PURPLE} />}>
      <View className="flex-row gap-2">
        {KEYS.map((key, i) => {
          const wd = i + 1;
          const count = lookup.get(wd) ?? 0;
          const intensity = count / max;
          const opacity = count === 0 ? 0.08 : 0.25 + intensity * 0.75;
          return (
            <View key={wd} className="flex-1 items-center gap-1.5">
              <View
                className="aspect-square w-full items-center justify-center rounded-md"
                style={{ backgroundColor: `rgba(52, 211, 153, ${opacity})` }}
              >
                <Text className="text-xs font-sans-semibold text-text">{count}</Text>
              </View>
              <Text className="font-sans text-[10px] text-text-muted">
                {t(`analytics.weekday.labels.${key}`)}
              </Text>
            </View>
          );
        })}
      </View>
    </PanelCard>
  );
}
