import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, SectionList, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { FAB } from "@/components/ui/FAB";
import { FilterChips, type FilterChipItem } from "@/components/ui/FilterChips";
import { ScreenHeadline } from "@/components/ui/ScreenHeadline";
import { ListSkeleton } from "@/components/ui/Skeletons";
import { SearchField } from "@/components/more/SearchField";
import { SectionCintillo } from "@/components/more/SectionCintillo";
import { NoteRow } from "@/components/notes/NoteRow";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useQuickNotes } from "@/hooks/useQuickNotes";
import { useQuickNoteMutations } from "@/hooks/useQuickNoteMutations";
import type { QuickNote } from "@/lib/types";
import { SIZE } from "@/theme/tokens";
import { categoryChipColors, useThemeColors } from "@/theme/useThemeColors";

type Filter = string; // "all" | "loose" | "pinned" | <categoryId>

function noteMatches(note: QuickNote, q: string): boolean {
  if (!q) return true;
  const hay = [note.title, ...note.sections.flatMap((s) => [s.heading, s.body])]
    .join("\n")
    .toLowerCase();
  return hay.includes(q);
}

const byUpdated = (a: QuickNote, b: QuickNote) =>
  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      quickNotes.filter((n) => {
        if (filter === "loose" && n.categoryId) return false;
        if (filter === "pinned" && !n.pinned) return false;
        if (filter !== "all" && filter !== "loose" && filter !== "pinned" && n.categoryId !== filter)
          return false;
        return noteMatches(n, q);
      }),
    [quickNotes, filter, q],
  );

  const sections = useMemo(() => {
    const pinned = filtered.filter((n) => n.pinned).sort(byUpdated);
    const rest = filtered.filter((n) => !n.pinned).sort(byUpdated);
    const out: { key: string; title: string; accent: boolean; data: QuickNote[] }[] = [];
    if (pinned.length) out.push({ key: "pinned", title: t("views.quickNotes.filters.pinned"), accent: true, data: pinned });
    if (rest.length) out.push({ key: "recent", title: t("views.quickNotes.recent"), accent: false, data: rest });
    return out;
  }, [filtered, t]);

  const catById = useMemo(
    () =>
      new Map(categories.map((cat) => [cat.id, { name: cat.name, dot: categoryChipColors(cat.color, c).dot }])),
    [categories, c],
  );
  const projectNameById = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);

  const pinnedCount = useMemo(() => quickNotes.filter((n) => n.pinned).length, [quickNotes]);
  const chips = useMemo<FilterChipItem<string>[]>(
    () => [
      { key: "all", label: t("views.quickNotes.filters.all"), count: quickNotes.length },
      ...categories.map((cat) => ({
        key: cat.id,
        label: cat.name,
        dot: categoryChipColors(cat.color, c).dot,
      })),
      { key: "loose", label: t("views.quickNotes.filters.loose") },
      { key: "pinned", label: t("views.quickNotes.filters.pinned") },
    ],
    [categories, c, quickNotes.length, t],
  );

  const handleNew = async () => {
    const note = await createNote({
      categoryId: filter !== "all" && filter !== "loose" && filter !== "pinned" ? filter : null,
    });
    if (note) router.push({ pathname: "/quick-note", params: { id: note.id } });
  };

  const onOpen = useCallback(
    (id: string) => router.push({ pathname: "/quick-note", params: { id } }),
    [router],
  );

  const header = (
    <View style={{ gap: 16, paddingBottom: 4 }}>
      <ScreenHeadline
        primary={t("views.quickNotes.headline", { count: quickNotes.length })}
        secondary={pinnedCount > 0 ? t("views.quickNotes.pinnedHeadline", { count: pinnedCount }) : null}
      />
      {quickNotes.length > 0 ? (
        <>
          <SearchField value={search} onChangeText={setSearch} placeholder={t("views.quickNotes.search")} />
          <FilterChips items={chips} value={filter} onChange={setFilter} />
        </>
      ) : null}
    </View>
  );

  if (initialLoading && quickNotes.length === 0) {
    return (
      <View className="flex-1 bg-bg">
        <ListSkeleton variant="card" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <SectionList
        sections={sections}
        keyExtractor={(n) => n.id}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <SectionCintillo label={section.title} accent={section.accent} />
        )}
        renderItem={({ item, index, section }) => {
          const cat = item.categoryId ? catById.get(item.categoryId) : undefined;
          return (
            <NoteRow
              note={item}
              categoryName={cat?.name ?? null}
              categoryColor={cat?.dot ?? null}
              projectName={item.projectId ? projectNameById.get(item.projectId) ?? null : null}
              onOpen={onOpen}
              last={index === section.data.length - 1}
            />
          );
        }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          quickNotes.length === 0 ? (
            <EmptyState
              title={t("views.quickNotes.empty")}
              body={t("views.quickNotes.emptyBody")}
              actions={
                <Pressable
                  onPress={handleNew}
                  accessibilityRole="button"
                  className="items-center justify-center rounded-md bg-accent px-4 active:opacity-80"
                  style={{ height: SIZE.chip }}
                >
                  <Text className="font-sans-semibold text-bg" style={{ fontSize: 15 }}>
                    {t("views.quickNotes.addFirst")}
                  </Text>
                </Pressable>
              }
            />
          ) : (
            <EmptyState
              title={
                q ? t("views.quickNotes.noMatch", { query: search.trim() }) : t("views.quickNotes.empty")
              }
            />
          )
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: SIZE.gutter, paddingTop: 8, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />
        }
      />

      <FAB
        icon={<Plus size={26} color={c.bg} />}
        label={t("views.quickNotes.newNote")}
        onPress={handleNew}
      />
    </View>
  );
}
