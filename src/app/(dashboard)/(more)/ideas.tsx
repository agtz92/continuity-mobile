import { useCallback, useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, Trash2 } from "lucide-react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { FAB } from "@/components/ui/FAB";
import { ScreenHeadline } from "@/components/ui/ScreenHeadline";
import { ListSkeleton } from "@/components/ui/Skeletons";
import { IdeaRow } from "@/components/more/IdeaRow";
import { SearchField } from "@/components/more/SearchField";
import { SheetRow } from "@/components/more/SheetRow";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useIdeaMutations } from "@/hooks/useIdeaMutations";
import { confirmAsync } from "@/lib/confirm";
import { daysSince } from "@/lib/date";
import type { Idea } from "@/lib/types";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

export default function Ideas() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const router = useRouter();
  const { ideas, initialLoading, refetch } = useDashboardData();
  const { promoteIdea, deleteIdea } = useIdeaMutations();

  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  // Idea cuyo menú ⋯ está abierto.
  const [menuIdea, setMenuIdea] = useState<Idea | null>(null);

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
      q
        ? ideas.filter(
            (i) =>
              i.title.toLowerCase().includes(q) ||
              i.description.toLowerCase().includes(q) ||
              i.why.toLowerCase().includes(q),
          )
        : ideas,
    [ideas, q],
  );
  const older = useMemo(
    () => ideas.filter((i) => (daysSince(i.created) ?? 0) > 30).length,
    [ideas],
  );

  const onPromote = useCallback((id: string) => void promoteIdea(id), [promoteIdea]);
  const onMore = useCallback((idea: Idea) => setMenuIdea(idea), []);

  // Lo que se elige en la hoja corre en `onClosed`: iOS no presenta un Alert
  // (ni otro modal) mientras la hoja todavía se está descartando.
  const pending = useRef<(() => void) | null>(null);
  const choose = (fn: (idea: Idea) => void) => {
    const idea = menuIdea;
    if (idea) pending.current = () => fn(idea);
    setMenuIdea(null);
  };
  const runPending = () => {
    const fn = pending.current;
    pending.current = null;
    fn?.();
  };
  const onEdit = () =>
    choose((idea) => router.push({ pathname: "/idea-form", params: { id: idea.id } }));
  const onDelete = () =>
    choose(async (idea) => {
      const ok = await confirmAsync(
        t("views.ideas.deleteConfirm", { title: idea.title }),
        undefined,
        t("common.delete"),
        t("common.cancel"),
      );
      if (ok) await deleteIdea(idea.id);
    });

  const header = (
    <View style={{ gap: 16, paddingBottom: 8 }}>
      <ScreenHeadline
        primary={t("views.ideas.headline", { count: ideas.length })}
        secondary={older > 0 ? t("views.ideas.olderHeadline", { count: older }) : null}
      />
      {ideas.length > 0 ? (
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder={t("views.ideas.search")}
        />
      ) : null}
    </View>
  );

  return (
    <View className="flex-1 bg-bg">
      {initialLoading && ideas.length === 0 ? (
        <ListSkeleton variant="card" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={({ item, index }) => (
            <IdeaRow
              idea={item}
              onPromote={onPromote}
              onMore={onMore}
              last={index === filtered.length - 1}
            />
          )}
          ListHeaderComponent={header}
          ListEmptyComponent={
            ideas.length === 0 ? (
              <EmptyState
                title={t("views.ideas.empty")}
                body={t("views.ideas.emptyBody")}
                rule={t("views.ideas.emptyRule")}
              />
            ) : (
              <EmptyState title={t("views.ideas.noMatch", { query: search.trim() })} />
            )
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: SIZE.gutter,
            paddingTop: 8,
            paddingBottom: 120,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />
          }
        />
      )}

      <BottomSheet
        visible={menuIdea != null}
        onClose={() => setMenuIdea(null)}
        onClosed={runPending}
        title={menuIdea?.title}
      >
        <SheetRow icon={Pencil} label={t("common.edit")} onPress={onEdit} />
        <SheetRow icon={Trash2} label={t("common.delete")} tone="signal" onPress={onDelete} />
      </BottomSheet>

      <FAB
        icon={<Plus size={26} color={c.bg} />}
        label={t("modals.idea.newTitle")}
        onPress={() => router.push("/idea-form")}
      />
    </View>
  );
}
