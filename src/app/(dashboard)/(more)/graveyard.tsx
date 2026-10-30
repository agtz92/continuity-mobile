import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MessageCircle, InfinityIcon } from "lucide-react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { Meta } from "@/components/ui/Meta";
import { ScreenHeadline } from "@/components/ui/ScreenHeadline";
import { GraveBlock } from "@/components/more/GraveBlock";
import { ReviveProjectModal } from "@/components/projects/ReviveProjectModal";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useGraveyardInsight } from "@/hooks/useGraveyardInsight";
import { countsTowardCap, usePlan } from "@/hooks/usePlan";
import { useProjectClosure } from "@/hooks/useProjectClosure";
import type { Project } from "@/lib/types";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

export default function Graveyard() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { projects, refetch } = useDashboardData();
  const { insight } = useGraveyardInsight();
  const closure = useProjectClosure();
  const { cap } = usePlan();

  const [reviveTarget, setReviveTarget] = useState<Project | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const killed = useMemo(
    () =>
      projects
        .filter((p) => p.status === "killed")
        .sort((a, b) => (b.killedAt ?? b.lastActivity).localeCompare(a.killedAt ?? a.lastActivity)),
    [projects],
  );
  const activeUsed = useMemo(
    () => projects.filter((p) => countsTowardCap(p.status)).length,
    [projects],
  );
  const wouldRestartCount = killed.filter((p) => (p.killedWouldRestart ?? "").trim()).length;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const onRevive = async (target: "active" | "idea") => {
    if (!reviveTarget) return;
    const ok = await closure.setStatus(reviveTarget, target);
    if (ok) setReviveTarget(null);
  };
  const pickRevive = useCallback((p: Project) => setReviveTarget(p), []);

  const askLoop = () =>
    router.push({ pathname: "/assistant", params: { prompt: t("views.graveyard.askLoopPrompt") } });

  const showAutopsy = !!insight && insight.deathsCount >= 3 && !!insight.body;

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingHorizontal: SIZE.gutter, paddingTop: 8, paddingBottom: 60 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />
      }
    >
      <ScreenHeadline
        primary={t("views.graveyard.headline", { count: killed.length })}
        secondary={
          wouldRestartCount > 0
            ? t("views.graveyard.restartHeadline", { count: wouldRestartCount })
            : null
        }
      />

      {/* Autopsia: bajo una regla de 3 px accent, sin tarjeta. El acento dice
          "esto es lectura tuya", no un segundo color de marca. */}
      <View style={{ marginTop: 24, marginBottom: 20 }}>
        <View style={{ height: 3, backgroundColor: showAutopsy ? c.accent : c.line[22] }} />
        <View style={{ paddingTop: 14, gap: 8 }}>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <InfinityIcon size={14} color={showAutopsy ? c.accent : c.text3} />
            <Meta
              variant="cintillo"
              tone="inherit"
              style={{ color: showAutopsy ? c.accent : c.text3 }}
            >
              {showAutopsy
                ? t("views.graveyard.patternAcross", { count: insight!.deathsCount })
                : t("views.graveyard.noPatternTitle")}
            </Meta>
          </View>
          <Text className="font-sans" style={{ fontSize: 16, lineHeight: 24, color: showAutopsy ? c.text : c.text3 }}>
            {showAutopsy ? insight!.body : t("views.graveyard.noPatternBody")}
          </Text>
          {showAutopsy ? (
            <Pressable
              onPress={askLoop}
              accessibilityRole="button"
              className="mt-1 flex-row items-center self-start rounded-md active:opacity-70"
              style={{
                height: SIZE.hit,
                paddingHorizontal: 14,
                gap: 8,
                borderWidth: 1,
                borderColor: c.line[22],
                backgroundColor: c.surface,
              }}
            >
              <MessageCircle size={18} color={c.accent} />
              <Text className="font-sans-medium" style={{ fontSize: 15, color: c.accent }}>
                {t("views.graveyard.askLoopShort")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {killed.length === 0 ? (
        <EmptyState title={t("views.graveyard.title")} body={t("views.graveyard.empty")} />
      ) : (
        killed.map((p) => (
          <GraveBlock
            key={p.id}
            project={p}
            locale={i18n.language || "en"}
            onRevive={pickRevive}
            disabled={closure.saving}
          />
        ))
      )}

      <ReviveProjectModal
        visible={reviveTarget !== null}
        projectName={reviveTarget?.name ?? ""}
        wouldRestart={reviveTarget?.killedWouldRestart}
        activeUsed={activeUsed}
        activeCap={cap ?? undefined}
        saving={closure.saving}
        onCancel={() => setReviveTarget(null)}
        onRevive={onRevive}
      />
    </ScrollView>
  );
}
