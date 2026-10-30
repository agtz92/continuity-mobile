import { Text, View } from "react-native";
import { TrendingUp } from "lucide-react-native";
import type { ProjectInteractionRow } from "@/lib/types";
import { type ThemeColors } from "@/theme/useThemeColors";
import { Delta, PanelCard, type T } from "./panels";

export function TopProjectsPanel({
  rows,
  t,
  c,
}: {
  rows: ProjectInteractionRow[];
  t: T;
  c: ThemeColors;
}) {
  return (
    <PanelCard
      title={t("analytics.topProjects.title")}
      icon={<TrendingUp size={16} color={c.accent2} />}
      subtitle={t("analytics.topProjects.subtitle")}
    >
      {rows.length === 0 ? (
        <Text className="font-sans py-4 text-sm text-text-muted">{t("analytics.topProjects.empty")}</Text>
      ) : (
        <View className="gap-2">
          {rows.map((r) => (
            <View
              key={r.projectId}
              className="flex-row items-center justify-between gap-3 rounded-lg border border-border bg-bg px-3 py-2"
            >
              <View className="min-w-0 flex-1">
                <Text className="font-sans text-sm text-text" numberOfLines={1}>
                  {r.name}
                </Text>
                <Text className="font-sans text-[11px] text-text-muted">{t(`status.${r.status}`)}</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Delta value={r.deltaVsPrev} c={c} />
                <Text className="text-base font-sans-semibold text-text">{r.interactions}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </PanelCard>
  );
}
