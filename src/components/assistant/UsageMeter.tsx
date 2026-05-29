import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { UsageSnapshot } from "@/lib/assistantApi";
import { useThemeColors } from "@/theme/useThemeColors";

const AMBER_T = "rgb(251,191,36)";

/**
 * Daily-message gauge under the header. Mirrors the web meter but drops the
 * "Upgrade" link — billing is web-only and Apple's rules forbid an in-app
 * purchase/upgrade CTA, so the bar just turns amber as the cap nears.
 */
export function UsageMeter({ usage }: { usage: UsageSnapshot | null }) {
  const { t } = useTranslation();
  const c = useThemeColors();
  if (!usage) return null;

  const cap = usage.daily_message_cap;
  const used = usage.messages_sent_today;
  const ratio = cap == null ? 0 : Math.min(1, used / Math.max(1, cap));
  const nearLimit = cap != null && ratio >= 0.8;

  return (
    <View className="border-b border-border px-4 py-2">
      <Text className="text-[11px] text-text-muted">
        {cap == null
          ? t("assistant.usage.uncapped")
          : t("assistant.usage.usedOf", { used, cap })}
      </Text>
      {cap != null && (
        <View className="mt-1.5 h-1 overflow-hidden rounded-full bg-border">
          <View
            className="h-full rounded-full"
            style={{
              width: `${Math.round(ratio * 100)}%`,
              backgroundColor: nearLimit ? AMBER_T : c.accent,
            }}
          />
        </View>
      )}
    </View>
  );
}
