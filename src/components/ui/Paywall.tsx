import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { THEME_SURFACES } from "@/theme/tokens";

/**
 * Gate shown for features above the user's plan. Names the required tier and
 * routes to web account management. Per Apple's multiplatform-service rules it
 * shows NO pricing and NO "subscribe/upgrade" CTA — only "manage my account",
 * which the caller wires to Linking.openURL of the authed web billing page.
 */
export function Paywall({
  requiredPlan,
  onManage,
}: {
  /** Display name of the tier, e.g. "Pro" or "Studio". */
  requiredPlan: string;
  onManage: () => void;
}) {
  const { t } = useTranslation();
  const { effective } = useTheme();
  const s = THEME_SURFACES[effective];

  return (
    <View className="items-center gap-3 rounded-2xl border border-border bg-surface p-6">
      <Lock color={s.textMuted} size={28} />
      <Text className="text-center text-lg font-semibold text-text">
        {t("paywall.title", { plan: requiredPlan })}
      </Text>
      <Text className="text-center text-text-muted">{t("paywall.body")}</Text>
      <Pressable
        onPress={onManage}
        accessibilityRole="button"
        className="mt-1 rounded-xl bg-accent px-5 py-3 active:opacity-90"
      >
        <Text className="font-semibold text-bg">{t("paywall.manage")}</Text>
      </Pressable>
    </View>
  );
}
