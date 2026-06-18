import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Lightbulb, Zap } from "lucide-react-native";
import { useThemeColors } from "@/theme/useThemeColors";
import { ClosureModalShell } from "./ClosureModalShell";

/**
 * Revive a killed project back to `active` or `idea`. No notes required; the
 * stored kill notes are kept as history. When `activeUsed`/`activeCap` are both
 * finite numbers we show the plan cap line ("X / Y active"); studio/admin plans
 * pass Infinity for the cap, which hides it.
 */
export function ReviveProjectModal({
  visible,
  projectName,
  wouldRestart,
  activeUsed,
  activeCap,
  saving,
  onCancel,
  onRevive,
}: {
  visible: boolean;
  projectName: string;
  wouldRestart?: string;
  /** Counting projects currently used (for the cap line). Optional. */
  activeUsed?: number;
  /** Plan cap for counting projects. Infinity/undefined hides the line. */
  activeCap?: number;
  saving: boolean;
  onCancel: () => void;
  onRevive: (target: "active" | "idea") => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();

  const showCap =
    typeof activeUsed === "number" &&
    typeof activeCap === "number" &&
    Number.isFinite(activeCap);

  return (
    <ClosureModalShell
      visible={visible}
      onClose={onCancel}
      dismissible={!saving}
      title={t("closure.revive.title", { name: projectName })}
      subtitle={t("closure.revive.subtitle")}
      footer={
        <Pressable
          onPress={onCancel}
          disabled={saving}
          accessibilityRole="button"
          className="items-center rounded-lg border border-border bg-surface py-3"
        >
          <Text className="text-base text-text">
            {t("closure.revive.leaveDead")}
          </Text>
        </Pressable>
      }
    >
      {!!wouldRestart && (
        <View className="rounded-lg border border-border bg-bg p-3">
          <Text className="mb-1 text-xs uppercase tracking-wider text-text-muted">
            {t("closure.revive.wouldRestartLabel")}
          </Text>
          <Text className="text-sm text-text">{wouldRestart}</Text>
        </View>
      )}
      {showCap && (
        <Text className="text-xs text-text-muted">
          {t("closure.revive.capLine", { used: activeUsed, cap: activeCap })}
        </Text>
      )}
      <Text className="text-sm text-text-muted">
        {t("closure.revive.bringBackAs")}
      </Text>
      <View className="flex-row gap-2">
        <Pressable
          onPress={() => !saving && onRevive("active")}
          disabled={saving}
          accessibilityRole="button"
          className="flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-accent py-3"
        >
          <Zap size={16} color={c.bg} />
          <Text className="text-base font-semibold text-bg">
            {t("closure.revive.active")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => !saving && onRevive("idea")}
          disabled={saving}
          accessibilityRole="button"
          className="flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-border bg-surface py-3"
        >
          <Lightbulb size={16} color={c.text} />
          <Text className="text-base font-semibold text-text">
            {t("closure.revive.idea")}
          </Text>
        </Pressable>
      </View>
    </ClosureModalShell>
  );
}
