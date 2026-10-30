import { Text, View } from "react-native";
import { Lightbulb, MoonStar } from "lucide-react-native";
import type { SleepingProjectRow, StaleIdeaRow } from "@/lib/types";
import { alpha } from "@/theme/useThemeColors";
import { PanelCard, AMBER, ROSE, INDIGO, ORANGE, YELLOW, type T } from "./panels";

export function SleepingStalePanel({
  sleeping,
  stale,
  t,
}: {
  sleeping: SleepingProjectRow[];
  stale: StaleIdeaRow[];
  t: T;
}) {
  // Tono del badge según los días inactivos del proyecto, en rangos crecientes de
  // urgencia: "7-14" ámbar, "15-30" naranja, "30+" rosa. `base` es el RGB crudo para
  // componer fondo/borde con alpha; `text` el color sólido de la etiqueta.
  const BUCKET: Record<SleepingProjectRow["bucket"], { base: string; text: string }> = {
    "7-14": { base: "245,158,11", text: AMBER },
    "15-30": { base: "249,115,22", text: ORANGE },
    "30+": { base: "244,63,94", text: ROSE },
  };
  return (
    <View className="gap-4">
      <PanelCard
        title={t("analytics.sleeping.title")}
        icon={<MoonStar size={16} color={INDIGO} />}
        subtitle={t("analytics.sleeping.subtitle")}
      >
        {sleeping.length === 0 ? (
          <Text className="font-sans py-4 text-sm text-text-muted">{t("analytics.sleeping.empty")}</Text>
        ) : (
          <View className="gap-2">
            {sleeping.map((s) => {
              const tone = BUCKET[s.bucket];
              return (
                <View
                  key={s.projectId}
                  className="flex-row items-center justify-between gap-3 rounded-lg border border-border bg-bg px-3 py-2"
                >
                  <Text className="font-sans min-w-0 flex-1 text-sm text-text" numberOfLines={1}>
                    {s.name}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <View
                      className="rounded-md border px-1.5 py-0.5"
                      style={{
                        backgroundColor: `rgba(${tone.base},0.15)`,
                        borderColor: `rgba(${tone.base},0.3)`,
                      }}
                    >
                      <Text className="font-sans text-[10px]" style={{ color: tone.text }}>
                        {s.bucket}d
                      </Text>
                    </View>
                    <Text className="font-sans text-xs text-text-muted">{s.daysIdle}d</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </PanelCard>

      <PanelCard
        title={t("analytics.stale.title")}
        icon={<Lightbulb size={16} color={YELLOW} />}
        subtitle={t("analytics.stale.subtitle")}
      >
        {stale.length === 0 ? (
          <Text className="font-sans py-4 text-sm text-text-muted">{t("analytics.stale.empty")}</Text>
        ) : (
          <View className="gap-2">
            {stale.map((s) => (
              <View
                key={s.ideaId}
                className="flex-row items-center justify-between gap-3 rounded-lg border border-border bg-bg px-3 py-2"
              >
                <Text className="font-sans min-w-0 flex-1 text-sm text-text" numberOfLines={1}>
                  {s.title}
                </Text>
                <Text className="font-sans text-xs text-text-muted">{s.daysOld}d</Text>
              </View>
            ))}
          </View>
        )}
      </PanelCard>
    </View>
  );
}
