import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Undo2 } from "lucide-react-native";
import type { Project } from "@/lib/types";
import { daysSince } from "@/lib/date";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

/**
 * Shown at the top of a paused project's detail screen: surfaces the stored
 * pause notes and offers to reactivate or keep paused. Copy is verbatim English
 * per the State Closure spec.
 */
export function WelcomeBackCard({
  project,
  reactivating,
  onReactivate,
  onDismiss,
}: {
  project: Project;
  reactivating: boolean;
  onReactivate: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const days = project.pausedAt ? daysSince(project.pausedAt) ?? 0 : 0;

  return (
    <View
      className="gap-3 rounded-xl border p-4"
      style={{
        backgroundColor: alpha(c.accent, 0.06),
        borderColor: alpha(c.accent, 0.3),
      }}
    >
      <View className="flex-row items-center gap-2">
        <Undo2 size={18} color={c.accent} />
        <Text className="flex-1 text-base font-semibold text-text">
          {t("closure.welcomeBack.title", { name: project.name })}
        </Text>
      </View>
      <Text className="text-sm text-text-muted">
        {t("closure.welcomeBack.pausedAgo", { count: days })}
      </Text>

      {!!project.pausedContext && (
        <View>
          <Text className="text-xs uppercase tracking-wider text-text-muted">
            {t("closure.welcomeBack.whereStopped")}
          </Text>
          <Text className="text-sm text-text">{project.pausedContext}</Text>
        </View>
      )}
      {!!project.pausedNextAction && (
        <View>
          <Text className="text-xs uppercase tracking-wider text-text-muted">
            {t("closure.welcomeBack.nextAction")}
          </Text>
          <Text className="text-sm text-text">
            {"→ "}
            {project.pausedNextAction}
          </Text>
        </View>
      )}
      {!!project.pausedBlocker && (
        <View>
          <Text className="text-xs uppercase tracking-wider text-text-muted">
            {t("closure.welcomeBack.blocker")}
          </Text>
          <Text className="text-sm text-text">{project.pausedBlocker}</Text>
        </View>
      )}

      <Text className="text-sm font-medium text-text">
        {t("closure.welcomeBack.ready")}
      </Text>
      <View className="flex-row gap-2">
        <Pressable
          onPress={onReactivate}
          disabled={reactivating}
          accessibilityRole="button"
          className="flex-1 items-center rounded-lg bg-accent py-2.5"
        >
          <Text className="text-sm font-semibold text-bg">
            {t("closure.welcomeBack.reactivate")}
          </Text>
        </Pressable>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          className="rounded-lg border border-border bg-surface px-4 py-2.5"
        >
          <Text className="text-sm text-text">
            {t("closure.welcomeBack.keepPaused")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
