import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react-native";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Explicit, always-visible back affordance for the (more) stack headers. The
 * native iOS back button renders only a thin chevron (often labelled with the
 * previous screen's title), which users were missing entirely — this gives a
 * clear, themed arrow with a generous tap target. Wired as `headerLeft` so it
 * replaces the default back button; only shown when there's somewhere to go.
 */
export function HeaderBackButton({ canGoBack }: { canGoBack?: boolean }) {
  const router = useRouter();
  const c = useThemeColors();
  const { t } = useTranslation();

  if (canGoBack === false) return null;

  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={t("common.back")}
      className="-ml-1 pr-3 py-1 active:opacity-60"
    >
      <ArrowLeft size={24} color={c.text} />
    </Pressable>
  );
}
