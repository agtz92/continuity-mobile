import { Linking, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react-native";
import { useThemeColors } from "@/theme/useThemeColors";
import { PrimaryButton } from "./controls";

// Apple rules: no prices, no "Subscribe" CTA in-app. The web's first-time
// branch shows plan cards + Stripe checkout — forbidden here. Mobile Step4 is
// info-only: it states the current plan and links out to the web billing page.
const WEB_BILLING_URL = "https://continuu.it/settings/billing";

/** Outbound row to the web billing page (only shown to non-exempt users). */
function ManageBillingLink() {
  const { t } = useTranslation();
  const c = useThemeColors();
  return (
    <Pressable
      onPress={() => void Linking.openURL(WEB_BILLING_URL)}
      accessibilityRole="button"
      className="flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-4 active:opacity-80"
    >
      <ExternalLink size={16} color={c.text} />
      <Text className="text-base font-semibold text-text">
        {t("onboarding.replay.planChangeCta")}
      </Text>
    </Pressable>
  );
}

/**
 * Step 4 — plan info (Apple-compliant). Three states:
 *  - replay: plan info + (non-exempt) manage-in-billing.
 *  - first-time exempt: the beta thank-you note.
 *  - first-time non-exempt: plan info + manage-in-billing.
 * Never shows prices, plan cards, or an in-app subscribe/checkout CTA.
 *
 * The primary button advances to step 5 (Personalize Today) via `onContinue`;
 * onboarding completion and the "watch tour again" CTA now live on step 5.
 */
export function Step4Plan({
  name,
  planLabel,
  isExempt,
  replay,
  busy,
  onContinue,
}: {
  name: string;
  planLabel: string;
  isExempt: boolean;
  replay: boolean;
  busy: boolean;
  onContinue: () => void;
}) {
  const { t } = useTranslation();

  if (replay) {
    return (
      <View className="gap-6">
        <View className="gap-2">
          <Text className="text-3xl font-bold text-text">
            {t("onboarding.replay.planHeading")}
          </Text>
          <Text className="text-base text-text-muted">
            {t("onboarding.replay.planInfo", { plan: planLabel })}
          </Text>
        </View>

        {!isExempt && <ManageBillingLink />}

        <PrimaryButton
          label={t("onboarding.continue")}
          onPress={onContinue}
          busy={busy}
        />
      </View>
    );
  }

  if (isExempt) {
    return (
      <View className="gap-6">
        <View className="gap-3">
          <Text className="text-3xl font-bold text-text">
            {t("onboarding.step4Beta.heading", { name })}
          </Text>
          <Text className="text-base leading-relaxed text-text-muted">
            {t("onboarding.step4Beta.body", { plan: planLabel })}
          </Text>
          <Text className="text-base leading-relaxed text-text-muted">
            {t("onboarding.step4Beta.body2")}
          </Text>
          <Text className="text-base font-medium text-text">
            — {t("onboarding.step4Beta.signoff")}
          </Text>
        </View>

        <PrimaryButton
          label={t("onboarding.continue")}
          onPress={onContinue}
          busy={busy}
        />
      </View>
    );
  }

  // First-time, non-exempt: info only, no prices/checkout.
  return (
    <View className="gap-6">
      <View className="gap-2">
        <Text className="text-3xl font-bold text-text">
          {t("onboarding.replay.planHeading")}
        </Text>
        <Text className="text-base text-text-muted">
          {t("onboarding.replay.planInfo", { plan: planLabel })}
        </Text>
      </View>

      <ManageBillingLink />

      <PrimaryButton
        label={t("onboarding.continue")}
        onPress={onContinue}
        busy={busy}
      />
    </View>
  );
}
