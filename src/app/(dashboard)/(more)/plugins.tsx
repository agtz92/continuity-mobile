import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@apollo/client/react";
import { ChevronRight, ListTodo } from "lucide-react-native";
import { GOOGLE_TASKS_CONNECTION_QUERY } from "@/lib/graphql";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

type ConnectionData = {
  googleTasksConnection: { connected: boolean; email: string | null };
};

export default function Plugins() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { data } = useQuery<ConnectionData>(GOOGLE_TASKS_CONNECTION_QUERY, {
    fetchPolicy: "cache-and-network",
  });
  const connected = !!data?.googleTasksConnection?.connected;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-4 p-5">
      <Pressable
        onPress={() => router.push("/google-tasks")}
        accessibilityRole="button"
        className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-4 active:opacity-80"
      >
        <View
          className="h-10 w-10 items-center justify-center rounded-lg border border-border"
          style={{ backgroundColor: alpha(c.accent, 0.12) }}
        >
          <ListTodo size={20} color={c.accent} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-medium text-text">
            {t("settings.plugins.googleTasks.name")}
          </Text>
          <Text className="mt-0.5 text-xs text-text-muted" numberOfLines={1}>
            {t("settings.plugins.googleTasks.shortDescription")}
          </Text>
        </View>
        <View
          className="rounded-full px-2 py-0.5"
          style={{
            borderWidth: 1,
            borderColor: connected ? alpha(c.accent, 0.5) : c.border,
            backgroundColor: connected ? alpha(c.accent, 0.1) : "transparent",
          }}
        >
          <Text
            className="text-xs"
            style={{ color: connected ? c.accent : c.textMuted }}
          >
            {connected
              ? t("settings.plugins.statusConnected")
              : t("settings.plugins.statusNotConnected")}
          </Text>
        </View>
        <ChevronRight size={16} color={c.textMuted} />
      </Pressable>

      <Text className="px-1 text-xs text-text-muted">
        {t("settings.plugins.comingSoonBody")}
      </Text>
    </ScrollView>
  );
}
