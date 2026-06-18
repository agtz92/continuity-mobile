import { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { HeartPulse, MessageCircle, RefreshCw, Sparkles } from "lucide-react-native";
import { Tombstone } from "@/components/icons/Tombstone";
import type { Project } from "@/lib/types";
import { daysSince } from "@/lib/date";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useGraveyardInsight } from "@/hooks/useGraveyardInsight";
import { useProjectClosure } from "@/hooks/useProjectClosure";
import { countsTowardCap, usePlan } from "@/hooks/usePlan";
import { ReviveProjectModal } from "@/components/projects/ReviveProjectModal";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

function Note({ label, body }: { label: string; body: string }) {
  if (!body) return null;
  return (
    <View>
      <Text className="text-[10px] uppercase tracking-wider text-text-muted">
        {label}
      </Text>
      <Text className="text-sm text-text">{body}</Text>
    </View>
  );
}

export default function Graveyard() {
  const { t } = useTranslation();
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
        .sort((a, b) =>
          (b.killedAt ?? b.lastActivity).localeCompare(a.killedAt ?? a.lastActivity)
        ),
    [projects]
  );

  const activeUsed = useMemo(
    () => projects.filter((p) => countsTowardCap(p.status)).length,
    [projects]
  );

  const wouldRestartCount = killed.filter((p) =>
    (p.killedWouldRestart ?? "").trim()
  ).length;

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

  const askLoop = () =>
    router.push({
      pathname: "/assistant",
      params: { prompt: t("views.graveyard.askLoopPrompt") },
    });

  const showAutopsy = !!insight && insight.deathsCount >= 3 && !!insight.body;

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ gap: 16, padding: 20, paddingBottom: 60 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={c.accent}
        />
      }
    >
      {/* Autopsy block (Layer B insight). */}
      {showAutopsy ? (
        <View
          className="gap-2 rounded-xl border p-4"
          style={{
            backgroundColor: alpha(c.accent2, 0.06),
            borderColor: alpha(c.accent2, 0.3),
          }}
        >
          <View className="flex-row items-center gap-2">
            <Sparkles size={16} color={c.accent2} />
            <Text className="text-sm font-semibold text-accent-2">
              {t("views.graveyard.patternTitle")}
            </Text>
          </View>
          <Text className="text-sm leading-snug text-text">{insight!.body}</Text>
          <Pressable
            onPress={askLoop}
            accessibilityRole="button"
            className="mt-1 flex-row items-center gap-1.5 self-start rounded-lg border px-3 py-2"
            style={{ borderColor: alpha(c.accent2, 0.4) }}
          >
            <MessageCircle size={14} color={c.accent2} />
            <Text className="text-sm font-medium text-accent-2">
              {t("views.graveyard.askLoop")}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="gap-1.5 rounded-xl border border-border bg-surface p-4">
          <View className="flex-row items-center gap-2">
            <Sparkles size={16} color={c.textMuted} />
            <Text className="text-sm font-semibold text-text">
              {t("views.graveyard.noPatternTitle")}
            </Text>
          </View>
          <Text className="text-sm text-text-muted">
            {t("views.graveyard.noPatternBody")}
          </Text>
        </View>
      )}

      {killed.length === 0 ? (
        <View className="items-center gap-2 rounded-xl border border-border bg-surface p-8">
          <Tombstone size={28} color={c.textMuted} />
          <Text className="text-center text-sm text-text-muted">
            {t("views.graveyard.empty")}
          </Text>
        </View>
      ) : (
        <>
          <Text className="text-xs text-text-muted">
            {t("views.graveyard.wouldRestartCount", {
              count: wouldRestartCount,
              total: killed.length,
            })}
          </Text>
          {killed.map((p) => (
            <View
              key={p.id}
              className="gap-3 rounded-xl border border-border bg-surface p-4"
            >
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-text">
                    {p.name}
                  </Text>
                  <Text className="text-xs text-text-muted">
                    {t("views.graveyard.lived", {
                      count: daysSince(p.created) ?? 0,
                    })}
                  </Text>
                </View>
                {(p.killedWouldRestart ?? "").trim() ? (
                  <View
                    className="flex-row items-center gap-1 self-start rounded-full border px-2 py-0.5"
                    style={{
                      backgroundColor: alpha(c.accent, 0.12),
                      borderColor: alpha(c.accent, 0.35),
                    }}
                  >
                    <RefreshCw size={11} color={c.accent} />
                    <Text className="text-[11px] text-accent">
                      {t("views.graveyard.wouldRestartBadge")}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Note
                label={t("views.graveyard.whyKilled")}
                body={p.killedReason ?? ""}
              />
              <Note
                label={t("views.graveyard.learnings")}
                body={p.killedLearnings ?? ""}
              />
              <Note
                label={t("views.graveyard.wouldRestart")}
                body={p.killedWouldRestart ?? ""}
              />

              {!!(p.killedAiReflection ?? "").trim() && (
                <View
                  className="gap-1 rounded-lg border p-3"
                  style={{
                    backgroundColor: alpha(c.accent2, 0.06),
                    borderColor: alpha(c.accent2, 0.25),
                  }}
                >
                  <View className="flex-row items-center gap-1.5">
                    <Sparkles size={13} color={c.accent2} />
                    <Text className="text-[10px] font-semibold uppercase tracking-wider text-accent-2">
                      {t("views.graveyard.ai")}
                    </Text>
                  </View>
                  <Text className="text-sm leading-snug text-text">
                    {p.killedAiReflection}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={() => setReviveTarget(p)}
                disabled={closure.saving}
                accessibilityRole="button"
                className="flex-row items-center gap-1.5 self-start rounded-lg border px-3 py-2"
                style={{ borderColor: c.border }}
              >
                <HeartPulse size={15} color={c.accent} />
                <Text className="text-sm font-medium text-accent">
                  {t("views.graveyard.revive")}
                </Text>
              </Pressable>
            </View>
          ))}
        </>
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
