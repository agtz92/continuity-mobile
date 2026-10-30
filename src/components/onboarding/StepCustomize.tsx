import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Settings2 } from "lucide-react-native";
import { useThemeColors } from "@/theme/useThemeColors";
import { PrimaryButton, StepHeading, StepLayout, TextButton } from "./controls";

/**
 * Paso 5 — closing onboarding beat: introduce the Today customize editor and
 * hand the user into it.
 *
 *  - primary ("Personalize Today", pie fijo) → `onCustomize`: completes
 *    onboarding and opens the Today layout editor (see onboarding.tsx →
 *    finishWithCustomize).
 *  - secondary → `onFinish`: first-time "Maybe later" (tour auto-starts) or
 *    replay "Done".
 *  - replay only: "Watch the dashboard tour again" → `onWatchTour`.
 */
export function StepCustomize({
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
    <StepLayout
      footer={
        <PrimaryButton label={t("onboarding.customize.primary")} onPress={onCustomize} busy={busy} />
      }
    >
      <StepHeading title={t("onboarding.customize.heading")} sub={t("onboarding.customize.sub")} />

      <View
        className="flex-row items-center"
        style={{
          gap: 12,
          padding: 16,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: c.line[14],
          backgroundColor: c.surface,
        }}
      >
        <Settings2 size={20} color={c.text3} />
        <Text className="font-sans flex-1" style={{ fontSize: 15, lineHeight: 21, color: c.text2 }}>
          {t("onboarding.customize.hint")}
        </Text>
      </View>

      <View style={{ gap: 4 }}>
        {replay && (
          <TextButton
            label={t("onboarding.replay.replayTourButton")}
            onPress={onWatchTour}
            disabled={busy}
            tone="accent"
          />
        )}
        <TextButton
          label={replay ? t("onboarding.replay.finishButton") : t("onboarding.customize.later")}
          onPress={onFinish}
          disabled={busy}
        />
      </View>
    </StepLayout>
  );
}
