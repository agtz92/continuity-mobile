import { Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@apollo/client/react";
import * as Clipboard from "expo-clipboard";
import { Copy, Lock, Sparkles, Trash2 } from "lucide-react-native";
import { assistantBaseUrl } from "@/lib/assistantApi";
import { MCP_CONNECTIONS_QUERY, REVOKE_MCP_CONNECTION } from "@/lib/graphql";
import { toast } from "@/lib/toast";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

/**
 * Conector de Claude (MCP remoto). Espejo de la web
 * (`frontend/src/app/(app)/settings/plugins/claude/page.tsx`): la conexión se
 * hace desde Claude, aquí solo se muestran los pasos, la URL y las conexiones
 * activas para revocarlas.
 */

// El conector MCP vive en el mismo backend que el asistente.
const CONNECTOR_URL = `${assistantBaseUrl}/mcp/`;

type McpConnection = {
  clientId: string;
  clientName: string;
  connectedAt: string | null;
};

export default function ClaudePlugin() {
  const { t } = useTranslation();
  const c = useThemeColors();

  const { data, refetch } = useQuery<{ mcpConnections: McpConnection[] }>(
    MCP_CONNECTIONS_QUERY,
    { fetchPolicy: "cache-and-network" },
  );
  const connections = data?.mcpConnections ?? [];
  const connected = connections.length > 0;

  const [revoke, { loading: revoking }] = useMutation(REVOKE_MCP_CONNECTION);

  const handleRevoke = async (clientId: string) => {
    try {
      await revoke({ variables: { clientId } });
      toast.success(t("settings.plugins.claude.disconnected"));
      refetch();
    } catch {
      toast.error(t("settings.plugins.claude.disconnectError"));
    }
  };

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(CONNECTOR_URL);
      toast.success(t("settings.plugins.claude.copied"));
    } catch {
      /* portapapeles no disponible */
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return "";
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return "";
    }
  };

  const steps = [1, 2, 3, 4].map((n) => t(`settings.plugins.claude.step${n}`));

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-4 p-5">
      <View className="gap-4 rounded-xl border border-border bg-surface p-4">
        <View className="flex-row items-center gap-3">
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
                ? t("settings.plugins.claude.statusConnected")
                : t("settings.plugins.claude.statusNotConnected")}
            </Text>
          </View>
        </View>
        <Text className="font-sans text-sm text-text-muted">
          {t("settings.plugins.claude.description")}
        </Text>
      </View>

      {connected ? (
        <View className="gap-3 rounded-xl border border-border bg-surface p-4">
          <Text className="text-sm font-sans-semibold text-text">
            {t("settings.plugins.claude.connectionsTitle")}
          </Text>
          {connections.map((conn) => (
            <View
              key={conn.clientId}
              className="flex-row items-center gap-3 rounded-lg border border-border px-3 py-2.5"
            >
              <View className="min-w-0 flex-1">
                <Text className="font-sans text-sm text-text">
                  {conn.clientName || "Claude"}
                </Text>
                {conn.connectedAt ? (
                  <Text className="font-sans mt-0.5 text-xs text-text-muted">
                    {t("settings.plugins.claude.connectedOn", {
                      date: formatDate(conn.connectedAt),
                    })}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => handleRevoke(conn.clientId)}
                disabled={revoking}
                accessibilityRole="button"
                accessibilityLabel={t("settings.plugins.claude.disconnect")}
                className="min-h-[44px] flex-row items-center gap-1.5 rounded-md border border-border px-3 active:opacity-80"
                style={{ opacity: revoking ? 0.5 : 1 }}
              >
                <Trash2 size={14} color={c.text} />
                <Text className="font-sans text-sm text-text">
                  {t("settings.plugins.claude.disconnect")}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <View className="gap-4 rounded-xl border border-border bg-surface p-4">
        <Text className="text-sm font-sans-semibold text-text">
          {t("settings.plugins.claude.howToTitle")}
        </Text>
        <View className="gap-3">
          {steps.map((step, i) => (
            <View key={i} className="flex-row gap-3">
              <View className="h-5 w-5 items-center justify-center rounded-full border border-border">
                <Text className="text-[11px] font-sans-semibold text-text">
                  {i + 1}
                </Text>
              </View>
              <Text className="font-sans flex-1 text-sm text-text-muted">{step}</Text>
            </View>
          ))}
        </View>

        <View className="gap-1.5">
          <Text className="text-[11px] font-sans-semibold uppercase tracking-wider text-text-muted">
            {t("settings.plugins.claude.urlLabel")}
          </Text>
          <Text
            selectable
            className="rounded-lg border border-border px-3 py-2 font-sans text-xs text-text"
          >
            {CONNECTOR_URL}
          </Text>
          <Pressable
            onPress={handleCopy}
            accessibilityRole="button"
            className="min-h-[44px] flex-row items-center justify-center gap-1.5 rounded-md border border-border active:opacity-80"
          >
            <Copy size={14} color={c.text} />
            <Text className="font-sans-medium text-sm text-text">
              {t("settings.plugins.claude.copyButton")}
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="flex-row items-start gap-3 rounded-xl border border-border bg-surface p-4">
        <Lock size={16} color={c.textMuted} style={{ marginTop: 2 }} />
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-sans-medium text-text">
            {t("settings.plugins.claude.privacyTitle")}
          </Text>
          <Text className="font-sans mt-1 text-xs text-text-muted">
            {t("settings.plugins.claude.privacyNote")}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
