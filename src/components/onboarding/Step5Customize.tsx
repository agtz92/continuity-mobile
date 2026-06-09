import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Settings2 } from "lucide-react-native";
import { useThemeColors } from "@/theme/useThemeColors";
import { PrimaryButton } from "./controls";

/**
 * Step 5 — closing onboarding beat: introduce the Today customize editor and
 * hand the user into it.
 *
 *  - primary ("Personalize Today") → `onCustomize`: completes onboarding and
 *    opens the Today layout editor (see onboarding.tsx → finishWithCustomize).
 *  - secondary → `onFinish`: first-time "Maybe later" (tour auto-starts) or
 *    replay "Done".
 *  - replay only: "Watch the dashboard tour again" → `onWatchTour` (moved here
 *    from the plan step so the tour CTA lives on the final screen).
 */
export function Step5Customize({
  replay,
  busy,
  onCustomize,
  onFinish,
  onWatchTour,
}: {
  replay: boolean;
  busy: boolean;
  onCustomize: () => void;
  onFinish: () => void;
  onWatchTour: () => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();

  return (
    <View className="gap-6">
      <View className="gap-3">
        <Text className="text-3xl font-bold text-text">
          {t("onboarding.step5.heading")}
        </Text>
        <Text className="text-base leading-relaxed text-text-muted">
          {t("onboarding.step5.sub")}
        </Text>
      </View>

      <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-4">
        <Settings2 size={20} color={c.textMuted} />
        <Text className="flex-1 text-sm text-text-muted">
          {t("onboarding.step5.hint")}
        </Text>
      </View>

      <PrimaryButton
        label={t("onboarding.step5.primary")}
        onPress={onCustomize}
        busy={busy}
      />

      {replay && (
        <Pressable
          onPress={onWatchTour}
          disabled={busy}
          accessibilityRole="button"
          className="items-center py-1"
          style={busy ? { opacity: 0.5 } : undefined}
        >
          <Text className="text-sm font-medium text-accent">
            {t("onboarding.replay.replayTourButton")}
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={onFinish}
        disabled={busy}
        accessibilityRole="button"
        className="items-center py-1"
        style={busy ? { opacity: 0.5 } : undefined}
      >
        <Text className="text-sm text-text-muted">
          {replay
            ? t("onboarding.replay.finishButton")
            : t("onboarding.step5.later")}
        </Text>
      </Pressable>
    </View>
  );
}
