import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react-native";
import { daysSince } from "@/lib/date";
import type { Project } from "@/lib/types";
import { useThemeColors } from "@/theme/useThemeColors";
import { ClosureModalShell } from "./ClosureModalShell";

export type StalledChoice = "active" | "pause" | "kill";

/**
 * Forces a decision on a stalled project: keep active, pause, or kill. No
 * dismiss without choosing. Shown one-at-a-time, queued by the dashboard. Copy
 * is verbatim English per the State Closure spec.
 *
 * "keep Active" resolves here (status -> active); "pause"/"kill" hand off to the
 * Pause/Kill modals (the parent opens those after this resolves).
 */
const OPTION_KEYS: { value: StalledChoice; key: string }[] = [
  { value: "active", key: "closure.stalled.optionActive" },
  { value: "pause", key: "closure.stalled.optionPause" },
  { value: "kill", key: "closure.stalled.optionKill" },
];

export function StalledProjectModal({
  visible,
  project,
  saving,
  onResolve,
}: {
  visible: boolean;
  project: Project | null;
  saving: boolean;
  onResolve: (choice: StalledChoice) => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const [choice, setChoice] = useState<StalledChoice | null>(null);

  if (!project) return null;

  const days =
    daysSince(project.stalledAt || project.lastActivity) ?? 0;
  const canSave = choice !== null && !saving;

  return (
    <ClosureModalShell
      visible={visible}
      onClose={() => {}}
      dismissible={false}
      title={t("closure.stalled.title", { name: project.name, count: days })}
      subtitle={t("closure.stalled.subtitle")}
      footer={
        <Pressable
          onPress={() => choice && onResolve(choice)}
          disabled={!canSave}
          accessibilityRole="button"
          className={
            "items-center rounded-lg py-3 " + (canSave ? "bg-accent" : "bg-border")
          }
        >
          <Text
            className={
              "text-base font-semibold " +
              (canSave ? "text-bg" : "text-text-muted")
            }
          >
            {t("closure.stalled.confirm")}
          </Text>
        </Pressable>
      }
    >
      <View className="gap-2">
        {OPTION_KEYS.map((opt) => {
          const active = choice === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setChoice(opt.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              className="flex-row items-center gap-3 rounded-lg border px-3 py-3"
              style={{
                borderColor: active ? c.accent : c.border,
                backgroundColor: active ? c.surface : "transparent",
              }}
            >
              <View
                className="h-5 w-5 items-center justify-center rounded-full border"
                style={{ borderColor: active ? c.accent : c.textMuted }}
              >
                {active && <Check size={13} color={c.accent} />}
              </View>
              <Text className="flex-1 text-base text-text">{t(opt.key)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="text-xs text-text-muted">
        {t("closure.stalled.footer")}
      </Text>
    </ClosureModalShell>
  );
}
