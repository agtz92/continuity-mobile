import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react-native";
import type { StudioHint as StudioHintData } from "@/lib/assistantApi";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

/**
 * Under a `canned` answer: what Studio would do with these same rows,
 * phrased as something the user would say. Mirror of the web `StudioHint`.
 *
 * The phrase and its label come from the server (`canned.studio_hint`), so
 * a new hint ships without a store release. Only the link and "hide" live
 * here. The link opens the read-only plan screen, never a price or a
 * "subscribe" button: that is rule 10 until the native paywall exists.
 */
export function StudioHint({
  hint,
  onDismiss,
}: {
  hint: StudioHintData;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();

  return (
    <View
      className="ml-9 border-l-2 py-1 pl-3"
      style={{ borderLeftColor: alpha(c.accent, 0.35) }}
    >
      <View className="flex-row items-center gap-1.5">
        <Sparkles size={11} color={c.accent} />
        <Text className="font-sans-medium text-xs" style={{ color: c.accent }}>
          {hint.label}
        </Text>
      </View>
      <Text className="font-sans mt-0.5 text-sm leading-5 text-text-muted">
        {hint.text}
      </Text>
      <View className="mt-1 flex-row items-center gap-2">
        <Pressable
          onPress={() => router.push("/billing")}
          accessibilityRole="link"
          hitSlop={8}
        >
          <Text className="font-sans text-xs" style={{ color: c.accent }}>
            {t("assistant.hint.cta")}
          </Text>
        </Pressable>
        <Text className="font-sans text-xs text-text-muted">·</Text>
        <Pressable onPress={onDismiss} accessibilityRole="button" hitSlop={8}>
          <Text className="font-sans text-xs text-text-muted">
            {t("assistant.hint.dismiss")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
