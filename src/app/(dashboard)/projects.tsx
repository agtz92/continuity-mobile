import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ArrowUpDown,
  Check,
  GripVertical,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react-native";
import type { Project, ProjectStatus } from "@/lib/types";
import { priorityRank } from "@/lib/types";
import { isDueToday, isOverdue } from "@/lib/date";
import { STATUS_FILTER_ORDER } from "@/lib/status";
import { PROJECT_SORT_MODES, type ProjectSortMode } from "@/lib/priority";
import { useStableLayout, type LayoutEntry } from "@/lib/useStableLayout";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useProjectMutations } from "@/hooks/useProjectMutations";
import { selectionFeedback } from "@/lib/feedback";
import { ProjectCardCompact } from "@/components/projects/ProjectCardCompact";
import { ListSkeleton } from "@/components/ui/Skeletons";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FAB } from "@/components/ui/FAB";
import { useThemeColors, alpha } from "@/theme/useThemeColors";

export default function Projects() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { projects, tasks, categoryById, initialLoading, refetch } =
    useDashboardData();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>("all");
  const [sortMode, setSortMode] = useState<ProjectSortMode>("manual");
  const [sortSheet, setSortSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  // Killed projects live in the Graveyard, not the main list: once killed a
  // project drops out of Projects entirely (it stays visible in the Graveyard).
  // Excluding them here feeds every downstream computation — the list, status
  // counts, the empty state — a killed-free set; the "killed" count becomes 0 so
  // its chip auto-hides. Other terminal states (e.g. archived) stay filterable.
  const visibleProjects = useMemo(
    () => projects.filter((p) => p.status !== "killed"),
    [projects]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: visibleProjects.length };
    for (const p of visibleProjects) {
      counts[p.status] = (counts[p.status] ?? 0) + 1;
    }
    return counts;
  }, [visibleProjects]);

  const { reorderProjects } = useProjectMutations();

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    const matchesSearch = (p: Project) => {
      if (!q) return true;
      const cat = p.categoryId ? categoryById[p.categoryId]?.name ?? "" : "";
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.nextStep.toLowerCase().includes(q) ||
        p.why.toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q)
      );
    };
    const matchesStatus = (p: Project) =>
      statusFilter === "all" || p.status === statusFilter;
    return visibleProjects.filter((p) => matchesSearch(p) && matchesStatus(p));
  }, [visibleProjects, categoryById, q, statusFilter]);

  // Sort + Smart sectioning. (B) Alphabetical is the stable final tiebreaker
  // everywhere; lastActivity only matters in "recent" (no longer a secondary
  // key that flings edited projects to the top of their band).
  const { sorted, sectionById } = useMemo(() => {
    const urgencyBucket = (p: Project) => {
      const pt = tasks.filter((tk) => tk.projectId === p.id);
      if (pt.some((tk) => !tk.done && isOverdue(tk.dueDate))) return 0;
      if (pt.some((tk) => !tk.done && isDueToday(tk.dueDate))) return 1;
      if (p.status === "stalled") return 2;
      return 3;
    };
    const recentTs = (p: Project) => new Date(p.lastActivity).getTime();
    const byName = (a: Project, b: Project) =>
      a.name.localeCompare(b.name, i18n.language);

    const compare = (a: Project, b: Project) => {
      switch (sortMode) {
        case "manual":
          return (a.position ?? 0) - (b.position ?? 0) || byName(a, b);
        case "priority": {
          const d = priorityRank(a.priority) - priorityRank(b.priority);
          return d !== 0 ? d : byName(a, b);
        }
        case "recent": {
          const r = recentTs(b) - recentTs(a);
          return r !== 0 ? r : byName(a, b);
        }
        case "name":
          return byName(a, b);
        case "status": {
          const sa = STATUS_FILTER_ORDER.indexOf(a.status);
          const sb = STATUS_FILTER_ORDER.indexOf(b.status);
          if (sa !== sb) return sa - sb;
          const pd = priorityRank(a.priority) - priorityRank(b.priority);
          return pd !== 0 ? pd : byName(a, b);
        }
        case "smart":
        default: {
          const ba = urgencyBucket(a);
          const bb = urgencyBucket(b);
          if (ba !== bb) return ba - bb;
          const pd = priorityRank(a.priority) - priorityRank(b.priority);
          return pd !== 0 ? pd : byName(a, b);
        }
      }
    };

    const s = [...filtered].sort(compare);
    const map = new Map<string, string>();
    for (const p of s) {
      const b = urgencyBucket(p);
      map.set(p.id, b <= 1 ? "attention" : b === 2 ? "risk" : "rest");
    }
    return { sorted: s, sectionById: map };
  }, [filtered, tasks, sortMode, i18n.language]);

  const ideal: LayoutEntry[] = useMemo(
    () =>
      sorted.map((p) => ({
        id: p.id,
        section: sortMode === "smart" ? sectionById.get(p.id) ?? null : null,
      })),
    [sorted, sectionById, sortMode]
  );
  const liveIds = useMemo(() => new Set(filtered.map((p) => p.id)), [filtered]);
  const layoutSignature = [sortMode, statusFilter, q].join("|");
  const { entries, isStale, resync } = useStableLayout(
    ideal,
    liveIds,
    layoutSignature
  );
  const projectById = useMemo(() => {
    const m = new Map<string, Project>();
    for (const p of visibleProjects) m.set(p.id, p);
    return m;
  }, [visibleProjects]);

  // (D) Manual drag only when no filters/search narrow the set.
  const manualDragEnabled =
    sortMode === "manual" && !q && statusFilter === "all";

  const onManualDragEnd = (next: Project[]) => {
    selectionFeedback();
    void reorderProjects(next.map((p) => p.id));
  };

  const statusChips = STATUS_FILTER_ORDER.filter(
    (s) => s === "all" || (statusCounts[s] ?? 0) > 0
  );

  const renderCard = (project: Project) => (
    <ProjectCardCompact
      project={project}
      projectTasks={tasks.filter((tk) => tk.projectId === project.id)}
      variant={project.status === "launched" ? "launched" : "active"}
      categoryById={categoryById}
      onPress={() =>
        router.push({ pathname: "/project/[id]", params: { id: project.id } })
      }
    />
  );

  // Flat list of rows for non-manual modes: section headers (Smart) interleaved
  // with project cards, walking the frozen layout so edits don't reshuffle.
  type ListRow =
    | { type: "header"; key: string; label: string }
    | { type: "project"; key: string; project: Project };
  const listRows: ListRow[] = [];
  {
    let currentSection: string | null = null;
    for (const entry of entries) {
      const p = projectById.get(entry.id);
      if (!p) continue;
      if (sortMode === "smart" && entry.section !== currentSection) {
        currentSection = entry.section;
        listRows.push({
          type: "header",
          key: `sec-${entry.section}`,
          label: t(`views.projects.sections.${entry.section}`),
        });
      }
      listRows.push({ type: "project", key: p.id, project: p });
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="gap-3 px-5 pb-3 pt-2">
        <Text className="text-2xl font-bold text-text">
          {t("views.projects.title")}
        </Text>

        <View className="flex-row items-center gap-2 rounded-lg border border-border bg-surface px-3">
          <Search size={16} color={c.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("views.projects.search")}
            placeholderTextColor={c.textMuted}
            className="flex-1 py-2.5"
            style={{ color: c.text }}
          />
        </View>

        {visibleProjects.length > 0 && (
          <View className="flex-row items-center gap-2">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-1.5 pr-2"
              className="flex-1"
            >
              {statusChips.map((s) => {
                const active = statusFilter === s;
                const label = s === "all" ? t("status.all") : t(`status.${s}`);
                const count = statusCounts[s] ?? 0;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setStatusFilter(s)}
                    className={
                      "flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 " +
                      (active
                        ? "border-accent bg-accent"
                        : "border-border bg-surface")
                    }
                  >
                    <Text
                      className={
                        "text-xs font-medium " +
                        (active ? "text-bg" : "text-text-muted")
                      }
                    >
                      {label}
                    </Text>
                    <Text
                      className={
                        "text-[10px] " + (active ? "text-bg" : "text-text-muted")
                      }
                    >
                      {count}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              onPress={() => setSortSheet(true)}
              className="flex-row items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5"
            >
              <SlidersHorizontal size={14} color={c.textMuted} />
              <Text className="text-xs text-text-muted">
                {t(`views.projects.sortBy.${sortMode}`)}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {initialLoading && visibleProjects.length === 0 ? (
        <ListSkeleton variant="card" />
      ) : visibleProjects.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-base text-center text-text-muted">
            {t("views.projects.empty")}
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3 px-5">
          <Text className="text-base text-center text-text-muted">
            {search.trim()
              ? t("views.projects.noMatchSearch", { query: search.trim() })
              : t("views.projects.noMatchFilters")}
          </Text>
          {(statusFilter !== "all" || !!search.trim()) && (
            <Pressable
              onPress={() => {
                setStatusFilter("all");
                setSearch("");
              }}
              className="rounded-md border border-border bg-surface px-3 py-1.5"
            >
              <Text className="text-xs text-text">
                {t("views.projects.clearFilters")}
              </Text>
            </Pressable>
          )}
        </View>
      ) : sortMode === "manual" && manualDragEnabled ? (
        // (D) Drag to reorder — persisted as "Mi orden".
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View className="flex-row items-center gap-1.5 px-5 pb-1">
            <ArrowUpDown size={12} color={c.textMuted} />
            <Text className="text-xs text-text-muted">
              {t("views.projects.manualHint")}
            </Text>
          </View>
          <DraggableFlatList
            data={sorted}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ gap: 12, padding: 20, paddingTop: 4 }}
            onDragEnd={({ data }) => onManualDragEnd(data)}
            renderItem={({ item, drag, isActive }: RenderItemParams<Project>) => (
              <ScaleDecorator>
                <View className="flex-row items-center gap-2">
                  <Pressable
                    onLongPress={drag}
                    disabled={isActive}
                    hitSlop={8}
                    className="py-2"
                  >
                    <GripVertical size={18} color={c.textMuted} />
                  </Pressable>
                  <View className="flex-1">{renderCard(item)}</View>
                </View>
              </ScaleDecorator>
            )}
          />
        </GestureHandlerRootView>
      ) : (
        // (A/C) Frozen layout; Smart adds section headers. A stale banner lets
        // the user re-sort on demand instead of rows jumping mid-edit.
        <FlatList
          data={listRows}
          keyExtractor={(row) => row.key}
          contentContainerStyle={{ gap: 12, padding: 20, paddingTop: 4 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.accent}
            />
          }
          ListHeaderComponent={
            sortMode === "manual" ? (
              <View className="flex-row items-center gap-1.5 pb-2">
                <ArrowUpDown size={12} color={c.textMuted} />
                <Text className="text-xs text-text-muted">
                  {t("views.projects.manualFilteredHint")}
                </Text>
              </View>
            ) : isStale ? (
              <View
                className="mb-1 flex-row items-center justify-between gap-3 rounded-lg border px-3 py-2"
                style={{
                  borderColor: alpha(c.accent, 0.3),
                  backgroundColor: alpha(c.accent, 0.1),
                }}
              >
                <Text className="flex-1 text-sm text-text-muted">
                  {t("views.projects.orderChanged")}
                </Text>
                <Pressable
                  onPress={resync}
                  className="flex-row items-center gap-1.5 rounded-md border px-3 py-1.5"
                  style={{ borderColor: alpha(c.accent, 0.3) }}
                >
                  <ArrowUpDown size={12} color={c.accent} />
                  <Text className="text-xs" style={{ color: c.accent }}>
                    {t("views.projects.reorder")}
                  </Text>
                </Pressable>
              </View>
            ) : null
          }
          renderItem={({ item }) =>
            item.type === "header" ? (
              <Text className="px-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                {item.label}
              </Text>
            ) : (
              renderCard(item.project)
            )
          }
        />
      )}

      <BottomSheet
        visible={sortSheet}
        onClose={() => setSortSheet(false)}
        title={t("views.projects.sortSheet.title")}
      >
        <View className="gap-1">
          {PROJECT_SORT_MODES.map((m) => {
            const active = sortMode === m;
            return (
              <Pressable
                key={m}
                onPress={() => {
                  setSortMode(m);
                  setSortSheet(false);
                }}
                className="flex-row items-center justify-between rounded-lg px-3 py-3"
              >
                <Text className={"text-base " + (active ? "text-accent" : "text-text")}>
                  {t(`views.projects.sortBy.${m}`)}
                </Text>
                {active && <Check size={18} color={c.accent} />}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>

      <FAB
        icon={<Plus size={26} color={c.bg} />}
        label={t("modals.project.newTitle")}
        onPress={() => router.push("/project-form")}
      />
    </SafeAreaView>
  );
}
