import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@apollo/client/react";
import { ChevronRight, Sparkles } from "lucide-react-native";
import { MCP_CONNECTIONS_QUERY } from "@/lib/graphql";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

type McpConnectionsData = {
  mcpConnections: { clientId: string }[];
};

export default function Plugins() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { data } = useQuery<McpConnectionsData>(MCP_CONNECTIONS_QUERY, {
    fetchPolicy: "cache-and-network",
  });
  const connected = (data?.mcpConnections?.length ?? 0) > 0;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-4 p-5">
      <Pressable
        onPress={() => router.push("/claude")}
        accessibilityRole="button"
        className="flex-row items-center gap-3 rounded-xl border border-border bg-surface p-4 active:opacity-80"
      >
        <View
          className="h-10 w-10 items-center justify-center rounded-lg border border-border"
          style={{ backgroundColor: alpha(c.accent, 0.12) }}
        >
          <Sparkles size={20} color={c.accent} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-sans-medium text-text">
            {t("settings.plugins.claude.name")}
          </Text>
          <Text className="font-sans mt-0.5 text-xs text-text-muted">
            {t("settings.plugins.claude.shortDescription")}
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
            className="font-sans text-xs"
            style={{ color: connected ? c.accent : c.textMuted }}
          >
            {connected
              ? t("settings.plugins.statusConnected")
              : t("settings.plugins.statusNotConnected")}
          </Text>
        </View>
        <ChevronRight size={16} color={c.textMuted} />
      </Pressable>

      <Text className="font-sans px-1 text-xs text-text-muted">
        {t("settings.plugins.comingSoonBody")}
      </Text>
    </ScrollView>
  );
}
