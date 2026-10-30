import { View } from "react-native";
import { CalendarDays } from "lucide-react-native";
import type { CadenceStats } from "@/lib/types";
import { PanelCard, StatTile, AMBER, type T } from "./panels";

export function CadencePanel({ cadence, t }: { cadence: CadenceStats; t: T }) {
  return (
    <PanelCard title={t("analytics.cadence.title")} icon={<CalendarDays size={16} color={AMBER} />}>
      <View className="gap-3">
        <View className="flex-row gap-3">
          <StatTile value={cadence.activeDaysInRange} label={t("analytics.cadence.activeDays")} />
          <StatTile value={cadence.totalActivityEvents} label={t("analytics.cadence.events")} />
        </View>
      </View>
    </PanelCard>
  );
}
