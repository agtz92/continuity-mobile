import { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Lightbulb, Plus, Search } from "lucide-react-native";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useIdeaMutations } from "@/hooks/useIdeaMutations";
import { FAB } from "@/components/ui/FAB";
import { useThemeColors } from "@/theme/useThemeColors";

const PURPLE = "168,85,247";
const PURPLE_T = "rgb(192,132,252)";

export default function Ideas() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const router = useRouter();
  const { ideas, initialLoading, refetch } = useDashboardData();
  const { promoteIdea, deleteIdea } = useIdeaMutations();

  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      q
        ? ideas.filter(
            (i) =>
              i.title.toLowerCase().includes(q) ||
              i.description.toLowerCase().includes(q) ||
              i.why.toLowerCase().includes(q)
          )
        : ideas,
    [ideas, q]
  );

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="gap-2 px-5 pb-3 pt-2">
        <Text className="text-2xl font-bold text-text">
          {t("views.ideas.title")}
        </Text>
        <Text className="text-sm text-text-muted">
          {t("views.ideas.subtitle")}
        </Text>
        {ideas.length > 0 && (
          <View className="mt-1 flex-row items-center gap-2 rounded-lg border border-border bg-surface px-3">
            <Search size={16} color={c.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("views.ideas.search")}
              placeholderTextColor={c.textMuted}
              className="flex-1 py-2.5"
              style={{ color: c.text }}
            />
          </View>
        )}
      </View>

      {initialLoading && ideas.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-base text-text-muted">…</Text>
        </View>
      ) : ideas.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-base text-center text-text-muted">
            {t("views.ideas.empty")}
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-base text-center text-text-muted">
            {t("views.ideas.noMatch", { query: search.trim() })}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ gap: 12, padding: 20, paddingTop: 4, paddingBottom: 96 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.accent}
            />
          }
        >
          {filtered.map((i) => (
            <View
              key={i.id}
              className="rounded-xl border p-4"
              style={{
                backgroundColor: `rgba(${PURPLE},0.05)`,
                borderColor: `rgba(${PURPLE},0.2)`,
              }}
            >
              <View className="mb-2 flex-row items-start gap-2">
                <Lightbulb size={16} color={PURPLE_T} style={{ marginTop: 2 }} />
                <Text
                  className="flex-1 font-semibold"
                  style={{ color: PURPLE_T }}
                >
                  {i.title}
                </Text>
              </View>
              {!!i.why && (
                <Text className="mb-2 text-sm italic" style={{ color: PURPLE_T }}>
                  → {i.why}
                </Text>
              )}
              {!!i.description && (
                <Text className="mb-3 text-sm text-text-muted">
                  {i.description}
                </Text>
              )}
              <View className="flex-row flex-wrap gap-2">
                <Pressable
                  onPress={() => promoteIdea(i.id)}
                  className="rounded-md px-3 py-1.5"
                  style={{ backgroundColor: `rgba(${PURPLE},0.2)` }}
                >
                  <Text className="text-xs font-medium" style={{ color: PURPLE_T }}>
                    {t("views.ideas.promote")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/idea-form",
                      params: { id: i.id },
                    })
                  }
                  className="rounded-md bg-border px-3 py-1.5"
                >
                  <Text className="text-xs text-text-muted">
                    {t("common.edit")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => deleteIdea(i.id)}
                  className="rounded-md bg-border px-3 py-1.5"
                >
                  <Text className="text-xs text-text-muted">
                    {t("common.delete")}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <FAB
        icon={<Plus size={26} color={c.bg} />}
        label={t("modals.idea.newTitle")}
        onPress={() => router.push("/idea-form")}
      />
    </SafeAreaView>
  );
}
