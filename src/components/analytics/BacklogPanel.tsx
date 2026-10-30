import { View } from "react-native";
import { AlertTriangle, Clock, Target, Trophy } from "lucide-react-native";
import type { BacklogHealth } from "@/lib/types";
import { type ThemeColors } from "@/theme/useThemeColors";
import { PanelCard, StatTile, AMBER, ROSE, type T } from "./panels";

export function BacklogPanel({ backlog, t, c }: { backlog: BacklogHealth; t: T; c: ThemeColors }) {
  return (
    <PanelCard
      title={t("analytics.backlog.title")}
      icon={<AlertTriangle size={16} color={AMBER} />}
      subtitle={t("analytics.backlog.subtitle", { count: backlog.openTasks })}
    >
      <View className="gap-3">
        <View className="flex-row gap-3">
          <StatTile
            value={backlog.overdueTasks}
            label={t("analytics.backlog.overdue")}
            tone={ROSE}
            icon={<AlertTriangle size={14} color={ROSE} />}
          />
          <StatTile
            value={backlog.dueSoonTasks}
            label={t("analytics.backlog.dueSoon")}
            tone={AMBER}
            icon={<Clock size={14} color={AMBER} />}
          />
        </View>
        <View className="flex-row gap-3">
          <StatTile
            value={backlog.quickWins}
            label={t("analytics.backlog.quickWins")}
            tone={c.accent}
            icon={<Target size={14} color={c.accent} />}
          />
          <StatTile
            value={backlog.almostThere}
            label={t("analytics.backlog.almostThere")}
            tone={c.accent2}
            icon={<Trophy size={14} color={c.accent2} />}
          />
        </View>
      </View>
    </PanelCard>
  );
}
