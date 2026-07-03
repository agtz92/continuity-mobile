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
import { Pin, Plus, Search } from "lucide-react-native";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useQuickNotes } from "@/hooks/useQuickNotes";
import { useQuickNoteMutations } from "@/hooks/useQuickNoteMutations";
import { FAB } from "@/components/ui/FAB";
import { ListSkeleton } from "@/components/ui/Skeletons";
import { categoryChipColors, useThemeColors } from "@/theme/useThemeColors";
import type { QuickNote } from "@/lib/types";

type Filter = string; // "all" | "loose" | "pinned" | <categoryId>

function noteMatches(note: QuickNote, q: string): boolean {
  if (!q) return true;
  const hay = [note.title, ...note.sections.flatMap((s) => [s.heading, s.body])]
    .join("\n")
    .toLowerCase();
  return hay.includes(q);
}

export default function QuickNotes() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const router = useRouter();
  const { categories, projects } = useDashboardData();
  const { quickNotes, initialLoading, refetch } = useQuickNotes();
  const { createNote } = useQuickNoteMutations();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
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
      quickNotes.filter((n) => {
        if (filter === "loose" && n.categoryId) return false;
        if (filter === "pinned" && !n.pinned) return false;
        if (
          filter !== "all" &&
          filter !== "loose" &&
          filter !== "pinned" &&
          n.categoryId !== filter
        )
          return false;
        return noteMatches(n, q);
      }),
    [quickNotes, filter, q]
  );

  const handleNew = async () => {
    const note = await createNote({
      categoryId:
        filter !== "all" && filter !== "loose" && filter !== "pinned"
          ? filter
          : null,
    });
    if (note) router.push({ pathname: "/quick-note", params: { id: note.id } });
  };

  const renderChip = (key: Filter, label: string, dot?: string) => {
    const active = filter === key;
    return (
      <Pressable
        key={key}
        onPress={() => setFilter(key)}
        className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
        style={{
          backgroundColor: active ? c.accent : c.surface,
          borderColor: active ? c.accent : c.border,
        }}
      >
        {dot ? (
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: dot }} />
        ) : null}
        <Text
          className="text-xs font-medium"
          style={{ color: active ? c.bg : c.textMuted }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="gap-2 px-5 pb-2 pt-2">
        <Text className="text-2xl font-bold text-text">
          {t("views.quickNotes.title")}
        </Text>
        <Text className="text-sm text-text-muted">
          {t("views.quickNotes.subtitle")}
        </Text>
        {quickNotes.length > 0 && (
          <View className="mt-1 flex-row items-center gap-2 rounded-lg border border-border bg-surface px-3">
            <Search size={16} color={c.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("views.quickNotes.search")}
              placeholderTextColor={c.textMuted}
              className="flex-1 py-2.5"
              style={{ color: c.text }}
            />
          </View>
        )}
      </View>

      {quickNotes.length > 0 && (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 8 }}
          >
            {renderChip("all", t("views.quickNotes.filters.all"))}
            {categories.map((cat) =>
              renderChip(cat.id, cat.name, categoryChipColors(cat.color, c).dot)
            )}
            {renderChip("loose", t("views.quickNotes.filters.loose"))}
            {renderChip("pinned", t("views.quickNotes.filters.pinned"))}
          </ScrollView>
        </View>
      )}

      {initialLoading && quickNotes.length === 0 ? (
        <ListSkeleton variant="card" />
      ) : quickNotes.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-4 px-5">
          <Text className="text-base text-center text-text-muted">
            {t("views.quickNotes.empty")}
          </Text>
          <Pressable
            onPress={handleNew}
            className="rounded-lg bg-accent px-4 py-2.5"
          >
            <Text className="text-base font-semibold text-bg">
              {t("views.quickNotes.addFirst")}
            </Text>
          </Pressable>
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-base text-center text-text-muted">
            {q
              ? t("views.quickNotes.noMatch", { query: search.trim() })
              : t("views.quickNotes.empty")}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ gap: 10, padding: 20, paddingTop: 4, paddingBottom: 96 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.accent}
            />
          }
        >
          {filtered.map((n) => {
            const cat = categories.find((x) => x.id === n.categoryId) ?? null;
            const proj = projects.find((p) => p.id === n.projectId) ?? null;
            const chip = cat ? categoryChipColors(cat.color, c) : null;
            const preview =
              n.sections.find((s) => s.body.trim())?.body.trim() ??
              n.sections.find((s) => s.heading.trim())?.heading.trim() ??
              "";
            return (
              <Pressable
                key={n.id}
                onPress={() =>
                  router.push({ pathname: "/quick-note", params: { id: n.id } })
                }
                className="overflow-hidden rounded-xl border border-border bg-surface"
              >
                <View className="flex-row">
                  <View
                    style={{ width: 4, backgroundColor: chip ? chip.dot : c.border }}
                  />
                  <View className="flex-1 p-4">
                    <View className="flex-row items-center gap-2">
                      <Text className="flex-1 font-semibold text-text" numberOfLines={1}>
                        {n.title.trim() || t("views.quickNotes.untitled")}
                      </Text>
                      {n.pinned && <Pin size={14} color={c.accent} />}
                    </View>
                    {!!preview && (
                      <Text className="mt-1 text-sm text-text-muted" numberOfLines={2}>
                        {preview}
                      </Text>
                    )}
                    <View className="mt-2 flex-row flex-wrap items-center gap-2">
                      {cat && chip && (
                        <View
                          className="rounded px-2 py-0.5"
                          style={{ backgroundColor: chip.bg }}
                        >
                          <Text className="text-[11px] font-medium" style={{ color: chip.text }}>
                            {cat.name}
                          </Text>
                        </View>
                      )}
                      {proj && (
                        <View className="rounded border border-border bg-bg px-2 py-0.5">
                          <Text className="text-[11px] text-text-muted" numberOfLines={1}>
                            {proj.name}
                          </Text>
                        </View>
                      )}
                      {!cat && !proj && (
                        <Text className="text-[11px] italic text-text-muted">
                          {t("views.quickNotes.standalone")}
                        </Text>
                      )}
                      <Text className="ml-auto text-[11px] text-text-muted">
                        {t("views.quickNotes.sectionCount", { count: n.sections.length })}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <FAB
        icon={<Plus size={26} color={c.bg} />}
        label={t("views.quickNotes.newNote")}
        onPress={handleNew}
      />
    </SafeAreaView>
  );
}
