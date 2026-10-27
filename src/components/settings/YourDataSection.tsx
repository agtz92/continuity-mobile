import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Download, Trash2 } from "lucide-react-native";
import { Meta } from "@/components/ui/Meta";
import { apolloClient } from "@/lib/apollo";
import { MY_DATA_EXPORT } from "@/lib/graphql";
import {
  deleteConversation,
  listConversations,
  type ConversationListItem,
} from "@/lib/assistantApi";
import { confirmAsync } from "@/lib/confirm";
import { toast } from "@/lib/toast";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * "Tus datos" (espejo de la web, `settings/YourDataSection`): descargar todo
 * lo que guardamos (portabilidad) y borrar conversaciones con Loop una a una.
 * El chat solo muestra la conversación actual, así que esta lista es la única
 * forma de ver cuáles quedan guardadas.
 */
export function YourDataSection() {
  const { t, i18n } = useTranslation();
  const c = useThemeColors();
  const [exporting, setExporting] = useState(false);
  const [conversations, setConversations] = useState<ConversationListItem[] | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    listConversations()
      .then(setConversations)
      .catch(() => setConversations([]));
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data } = await apolloClient.query<{ myDataExport: string }>({
        query: MY_DATA_EXPORT,
        fetchPolicy: "no-cache",
      });
      if (!data) throw new Error("empty export");
      const name = `continuuit-mis-datos-${new Date().toISOString().split("T")[0]}.json`;
      const file = new File(Paths.cache, name);
      if (file.exists) file.delete();
      file.create();
      file.write(data.myDataExport);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/json",
          UTI: "public.json",
          dialogTitle: name,
        });
      }
    } catch {
      toast.error(t("settings.yourData.exportError"));
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (conv: ConversationListItem) => {
    const ok = await confirmAsync(
      t("settings.yourData.delete"),
      conv.title || t("settings.yourData.untitled"),
      t("settings.yourData.confirmDelete"),
      t("settings.yourData.cancel"),
    );
    if (!ok) return;
    setDeleting(conv.id);
    try {
      await deleteConversation(conv.id);
      setConversations((cs) => (cs ?? []).filter((x) => x.id !== conv.id));
      toast.success(t("settings.yourData.conversationDeleted"));
    } catch {
      toast.error(t("settings.yourData.deleteError"));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <View className="gap-4 rounded-xl border border-border bg-surface p-5">
      <View className="gap-2">
        <Meta variant="cintillo" tone="muted">
          {t("settings.yourData.title")}
        </Meta>
        <Text className="font-sans text-sm text-text-muted">
          {t("settings.yourData.exportBody")}
        </Text>
        <Pressable
          onPress={() => void handleExport()}
          disabled={exporting}
          accessibilityRole="button"
          className="flex-row items-center justify-center gap-2 rounded-lg border border-border bg-bg py-3 active:opacity-80"
          style={{ opacity: exporting ? 0.6 : 1 }}
        >
          <Download size={16} color={c.text} />
          <Text className="font-sans-medium text-sm text-text">
            {exporting ? t("settings.yourData.exporting") : t("settings.yourData.export")}
          </Text>
        </Pressable>
      </View>

      <View className="gap-2">
        <Meta variant="cintillo" tone="muted">
          {t("settings.yourData.conversationsTitle")}
        </Meta>
        {conversations === null ? (
          <ActivityIndicator color={c.textMuted} />
        ) : conversations.length === 0 ? (
          <Text className="font-sans text-sm text-text-muted">
            {t("settings.yourData.noConversations")}
          </Text>
        ) : (
          <View className="rounded-lg border border-border">
            {conversations.map((conv, i) => (
              <View
                key={conv.id}
                className={
                  "flex-row items-center gap-3 px-3 py-2 " +
                  (i > 0 ? "border-t border-border" : "")
                }
              >
                <View className="flex-1">
                  <Text numberOfLines={1} className="font-sans text-sm text-text">
                    {conv.title || t("settings.yourData.untitled")}
                  </Text>
                  <Text className="font-sans text-xs text-text-muted">
                    {new Date(conv.updated_at).toLocaleDateString(i18n.language)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => void handleDelete(conv)}
                  disabled={deleting === conv.id}
                  accessibilityRole="button"
                  accessibilityLabel={t("settings.yourData.delete")}
                  hitSlop={8}
                  className="p-1.5"
                  style={{ opacity: deleting === conv.id ? 0.4 : 1 }}
                >
                  <Trash2 size={18} color={c.textMuted} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
