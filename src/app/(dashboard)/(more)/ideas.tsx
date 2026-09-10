import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScreenTitle } from "@/components/ui/ScreenTitle";
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
import { ListSkeleton } from "@/components/ui/Skeletons";
import { alpha, useThemeColors } from "@/theme/useThemeColors";


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
        <ScreenTitle>
          {t("views.ideas.title")}
        </ScreenTitle>
        <Text className="font-sans text-sm text-text-muted">
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
        <ListSkeleton variant="card" />
      ) : ideas.length === 0 ? (
        <View className="flex-1 px-5">
          <EmptyState
            title={t("views.ideas.empty")}
            body={t("views.ideas.emptyBody")}
            rule={t("views.ideas.emptyRule")}
          />
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 px-5">
          <EmptyState title={t("views.ideas.noMatch", { query: search.trim() })} />
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
                backgroundColor: alpha(c.text3, 0.05),
                borderColor: alpha(c.text3, 0.2),
              }}
            >
              <View className="mb-2 flex-row items-start gap-2">
                <Lightbulb size={16} color={c.text3} style={{ marginTop: 2 }} />
                <Text
                  className="flex-1 font-sans-semibold"
                  style={{ color: c.text3 }}
                >
                  {i.title}
                </Text>
              </View>
              {!!i.why && (
                <Text className="font-sans mb-2 text-sm italic" style={{ color: c.text3 }}>
                  → {i.why}
                </Text>
              )}
              {!!i.description && (
                <Text className="font-sans mb-3 text-sm text-text-muted">
                  {i.description}
                </Text>
              )}
              <View className="flex-row flex-wrap gap-2">
                <Pressable
                  onPress={() => promoteIdea(i.id)}
                  className="rounded-md px-3 py-1.5"
                  style={{ backgroundColor: alpha(c.text3, 0.2) }}
                >
                  <Text className="text-xs font-sans-medium" style={{ color: c.text3 }}>
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
                  <Text className="font-sans text-xs text-text-muted">
                    {t("common.edit")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => deleteIdea(i.id)}
                  className="rounded-md bg-border px-3 py-1.5"
                >
                  <Text className="font-sans text-xs text-text-muted">
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
