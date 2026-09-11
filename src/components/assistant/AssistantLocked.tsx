import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ListChecks, Search, Sparkles } from "lucide-react-native";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * What a free account sees where the chat used to be. Mirror of the web
 * `AssistantLocked`.
 *
 * Deliberately not a padlock: the entry points stay exactly where they
 * were, because this screen is the pitch. It shows what Loop would do with
 * *their* projects, using the same three examples the catalogue actually
 * answers. A screen that only says "not available on your plan" teaches
 * nobody anything.
 */
export function AssistantLocked() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();

  const samples = [
    { Icon: ListChecks, key: "assistant.locked.sampleOverdue" },
    { Icon: Sparkles, key: "assistant.locked.sampleStalled" },
    { Icon: Search, key: "assistant.locked.sampleSearch" },
  ] as const;

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 24, gap: 20 }}
    >
      <View className="gap-2">
        <Text
          className="font-display text-text"
          style={{ fontSize: 20, lineHeight: 24, letterSpacing: -0.4 }}
        >
          {t("assistant.locked.title")}
        </Text>
        <Text className="font-sans text-sm leading-5 text-text-muted">
          {t("assistant.locked.body")}
        </Text>
      </View>

      <View className="gap-2">
        {samples.map(({ Icon, key }) => (
          <View
            key={key}
            className="flex-row items-start gap-3 rounded-xl border border-border bg-surface px-3 py-3"
          >
            <Icon size={16} color={c.accent} />
            <Text className="font-sans flex-1 text-sm leading-5 text-text">
              {t(key)}
            </Text>
          </View>
        ))}
      </View>

      <View className="gap-2">
        <Pressable
          onPress={() => router.push("/billing")}
          accessibilityRole="button"
          className="items-center rounded-full px-4 py-3"
          style={{ backgroundColor: c.accent }}
        >
          <Text
            className="font-sans-medium text-sm"
            style={{ color: c.bg }}
          >
            {t("assistant.locked.cta")}
          </Text>
        </Pressable>
        <Text className="font-sans text-xs leading-4 text-text-muted">
          {t("assistant.locked.footnote")}
        </Text>
      </View>
    </ScrollView>
  );
}
