import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, SectionList, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useApolloClient, useQuery } from "@apollo/client/react";

import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips, type FilterChipItem } from "@/components/ui/FilterChips";
import { ScreenHeadline } from "@/components/ui/ScreenHeadline";
import { ListSkeleton } from "@/components/ui/Skeletons";
import { LOG_FILTERS, LogRow, matchesFilter, type LogFilter } from "@/components/log/entries";
import { SearchField } from "@/components/more/SearchField";
import { SectionCintillo } from "@/components/more/SectionCintillo";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useNoteMutations } from "@/hooks/useNoteMutations";
import { confirmAsync } from "@/lib/confirm";
import { toLocalISO, todayLocalISODate, weekStartISO } from "@/lib/date";
import { ACTIVITY_QUERY } from "@/lib/graphql";
import type { Activity } from "@/lib/types";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

type BucketKey = "today" | "yesterday" | "thisWeek" | "thisMonth" | "older";
const BUCKET_ORDER: BucketKey[] = ["today", "yesterday", "thisWeek", "thisMonth", "older"];

// El dashboard solo trae 60 días de actividad (`DASHBOARD_ACTIVITY_DAYS`), así
// que la bitácora pide la suya: la primera página con caché (sirve sin red) y
// las anteriores bajo demanda. El servidor topa cada página en 500.
const PAGE = 200;

type Feed = { activity: Activity[] };

export default function Log() {
  const { t, i18n } = useTranslation();
  const c = useThemeColors();
  const locale = i18n.language;
  const client = useApolloClient();
  const { projects } = useDashboardData();
  const { data, loading, refetch } = useQuery<Feed>(ACTIVITY_QUERY, {
    variables: { limit: PAGE },
    fetchPolicy: "cache-and-network",
  });
  const { deleteNote } = useNoteMutations();

  // Páginas viejas: historia, casi no cambia. Se quedan en estado local (un
  // refetch de la primera página no las tira) y se quitan a mano al borrar.
  const [older, setOlder] = useState<Activity[]>([]);
  const [exhausted, setExhausted] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const activities = useMemo(() => {
    const byId = new Map<string, Activity>();
    for (const a of [...(data?.activity ?? []), ...older]) byId.set(a.id, a);
    return [...byId.values()].sort((a, b) => b.created.localeCompare(a.created));
  }, [data, older]);
  const initialLoading = loading && !data;
  const canLoadOlder = !exhausted && (data?.activity.length ?? 0) >= PAGE;

  const loadOlder = useCallback(async () => {
    const oldest = activities[activities.length - 1];
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const res = await client.query<Feed>({
        query: ACTIVITY_QUERY,
        variables: { limit: PAGE, until: oldest.created },
        fetchPolicy: "network-only",
      });
      // `until` es inclusivo: la frontera vuelve repetida y el Map la junta.
      const page = res.data?.activity ?? [];
      if (page.length < PAGE) setExhausted(true);
      setOlder((prev) => [...prev, ...page]);
    } catch {
      /* sin red: el botón sigue ahí para reintentar */
    } finally {
      setLoadingOlder(false);
    }
  }, [activities, client, loadingOlder]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LogFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const boundaries = useMemo(() => {
    const today = todayLocalISODate();
    const yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);
    const monthDate = new Date();
    monthDate.setDate(1);
    return {
      today,
      yesterday: toLocalISO(yDate),
      weekStart: weekStartISO(),
      monthStart: toLocalISO(monthDate),
    };
  }, []);

  const projectNameById = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);

  const q = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      activities.filter((a) => {
        if (!matchesFilter(a.kind, filter)) return false;
        if (!q) return true;
        const haystack = [
          a.note,
          a.entityTitle,
          (a.projectId && projectNameById.get(a.projectId)) || "",
          a.previousValue,
          a.newValue,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      }),
    [activities, projectNameById, filter, q],
  );

  // Secciones por cubeta (día local, no UTC); descarta las vacías.
  const sections = useMemo(() => {
    const buckets: Record<BucketKey, Activity[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      thisMonth: [],
      older: [],
    };
    for (const a of visible) {
      const date = toLocalISO(new Date(a.created));
      const key: BucketKey =
        date === boundaries.today
          ? "today"
          : date === boundaries.yesterday
            ? "yesterday"
            : date >= boundaries.weekStart
              ? "thisWeek"
              : date >= boundaries.monthStart
                ? "thisMonth"
                : "older";
      buckets[key].push(a);
    }
    return BUCKET_ORDER.map((bucket) => ({
      key: bucket,
      title: t(`views.log.buckets.${bucket}`),
      data: buckets[bucket],
    })).filter((s) => s.data.length > 0);
  }, [visible, boundaries, t]);

  const onDeleteNote = useCallback(
    async (id: string) => {
      if (await confirmAsync(t("views.log.deleteConfirm"), undefined, t("common.delete"), t("common.cancel"))) {
        await deleteNote(id);
        setOlder((prev) => prev.filter((a) => a.id !== id));
        void refetch().catch(() => undefined);
      }
    },
    [deleteNote, refetch, t],
  );

  const chips = useMemo<FilterChipItem<LogFilter>[]>(
    () => LOG_FILTERS.map((f) => ({ key: f, label: t(`views.log.filters.${f}`) })),
    [t],
  );

  const timeFor = (iso: string, bucket: string) => {
    const d = new Date(iso);
    return bucket === "today" || bucket === "yesterday"
      ? d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false })
      : d.toLocaleDateString(locale, { month: "short", day: "numeric" });
  };

  const header = (
    <View style={{ gap: 16, paddingBottom: 4 }}>
      <ScreenHeadline primary={t("tabs.log")} />
      <SearchField value={search} onChangeText={setSearch} placeholder={t("views.log.search")} />
      <FilterChips items={chips} value={filter} onChange={setFilter} />
    </View>
  );

  if (initialLoading && activities.length === 0) {
    return (
      <View className="flex-1 bg-bg">
        <ListSkeleton />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <SectionList
        sections={sections}
        keyExtractor={(a) => a.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: SIZE.gutter, paddingTop: 8, paddingBottom: 96 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />
        }
        ListHeaderComponent={header}
        ListFooterComponent={
          canLoadOlder ? (
            <Pressable
              onPress={() => void loadOlder()}
              disabled={loadingOlder}
              accessibilityRole="button"
              accessibilityLabel={t("views.log.loadOlder")}
              className="mt-4 items-center justify-center rounded-lg border border-border"
              style={{ minHeight: SIZE.hit }}
            >
              {loadingOlder ? (
                <ActivityIndicator color={c.accent} />
              ) : (
                <Text className="text-sm font-sans-medium text-accent">{t("views.log.loadOlder")}</Text>
              )}
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          activities.length === 0 ? (
            <EmptyState title={t("views.log.empty")} body={t("views.log.emptyBody")} />
          ) : (
            <EmptyState
              title={q ? t("views.log.noMatch", { query: search.trim() }) : t("views.log.noneInFilter")}
            />
          )
        }
        renderSectionHeader={({ section }) => (
          <SectionCintillo label={section.title} count={section.data.length} />
        )}
        renderItem={({ item, index, section }) => (
          <LogRow
            activity={item}
            time={timeFor(item.created, section.key)}
            projectName={item.projectId ? projectNameById.get(item.projectId) ?? null : null}
            locale={locale}
            t={t}
            onDeleteNote={onDeleteNote}
            deleteLabel={t("views.log.deleteEntryAria")}
            last={index === section.data.length - 1}
          />
        )}
      />
    </View>
  );
}
