import { Figure } from "@/components/ui/Figure";
import { Meta } from "@/components/ui/Meta";
import { View } from "react-native";
import { ArrowRightCircle } from "lucide-react-native";
import type { IdeaFunnel } from "@/lib/types";
import { type ThemeColors } from "@/theme/useThemeColors";
import { PanelCard, PINK, type T } from "./panels";

export function IdeaFunnelPanel({ funnel, t, c }: { funnel: IdeaFunnel; t: T; c: ThemeColors }) {
  const pct = Math.round(funnel.promotionRate * 100);
  return (
    <PanelCard
      title={t("analytics.ideaFunnel.title")}
      icon={<ArrowRightCircle size={16} color={PINK} />}
      subtitle={t("analytics.ideaFunnel.subtitle")}
    >
      <View className="flex-row gap-3">
        <View className="flex-1 rounded-lg border border-border bg-bg p-3">
          <Figure>{funnel.ideasCreated}</Figure>
          <Meta variant="cintillo" tone="muted" className="mt-1">{t("analytics.ideaFunnel.created")}</Meta>
        </View>
        <View className="flex-1 rounded-lg border border-border bg-bg p-3">
          <Figure tone={c.accent}>{funnel.ideasPromoted}</Figure>
          <Meta variant="cintillo" tone="muted" className="mt-1">{t("analytics.ideaFunnel.promoted")}</Meta>
        </View>
        <View className="flex-1 rounded-lg border border-border bg-bg p-3">
          <View className="flex-row items-baseline gap-0.5">
            <Figure>{pct}</Figure>
            <Meta tone="faint">%</Meta>
          </View>
          <Meta variant="cintillo" tone="muted" className="mt-1">{t("analytics.ideaFunnel.rate")}</Meta>
        </View>
      </View>
    </PanelCard>
  );
}
