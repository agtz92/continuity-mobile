import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NotificationStack } from "@/components/notifications/NotificationStack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowUpDown, Check, Plus, Search } from "lucide-react-native";
import type { Project, ProjectStatus, Task } from "@/lib/types";
import { priorityRank } from "@/lib/types";
import { isDueToday, isOverdue } from "@/lib/date";
import { STATUS_FILTER_ORDER } from "@/lib/status";
import { PROJECT_SORT_MODES, type ProjectSortMode } from "@/lib/priority";
import { projectIsBlocked, taskIsBlocked } from "@/lib/cooling";
import { useStableLayout, type LayoutEntry } from "@/lib/useStableLayout";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useProjectMutations } from "@/hooks/useProjectMutations";
import { selectionFeedback } from "@/lib/feedback";
import { ProjectListItem } from "@/components/projects/ProjectListItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { Meta } from "@/components/ui/Meta";
import { ListSkeleton } from "@/components/ui/Skeletons";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FAB } from "@/components/ui/FAB";
import { ScreenHeadline } from "@/components/ui/ScreenHeadline";
import { FilterChips, type FilterChipItem } from "@/components/ui/FilterChips";
import { SIZE } from "@/theme/tokens";
import { useThemeColors, alpha } from "@/theme/useThemeColors";

type StatusKey = "all" | ProjectStatus;
type ListRow =
  | { type: "header"; key: string; label: string }
  | { type: "project"; key: string; project: Project };

// Virtualización: filas de alto variable (el título envuelve), así que nada de
// getItemLayout; solo ventanas más cortas que el default (21).
const LIST_PERF = {
  initialNumToRender: 8,
  maxToRenderPerBatch: 8,
  windowSize: 7,
} as const;

export default function Projects() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { projects, tasks, categoryById, initialLoading, refetch } =
    useDashboardData();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusKey>("all");
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

  // Tareas por proyecto, una sola pasada: arrays estables para las filas memo.
  const tasksByProject = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const tk of tasks) {
      if (!tk.projectId) continue;
      const list = m.get(tk.projectId);
      if (list) list.push(tk);
      else m.set(tk.projectId, [tk]);
    }
    return m;
  }, [tasks]);

  // Horas invertidas (tareas cerradas con esfuerzo), igual que Today.
  const hoursByProject = useMemo(() => {
    const m = new Map<string, number>();
    for (const [pid, list] of tasksByProject) {
      const sum = list
        .filter((tk) => tk.done && tk.effortHours != null)
        .reduce((acc, tk) => acc + (tk.effortHours as number), 0);
      m.set(pid, Math.round(sum * 10) / 10);
    }
    return m;
  }, [tasksByProject]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: visibleProjects.length };
    for (const p of visibleProjects) {
      counts[p.status] = (counts[p.status] ?? 0) + 1;
    }
    return counts;
  }, [visibleProjects]);

  const blockedTotal = useMemo(
    () =>
      visibleProjects.filter((p) =>
        projectIsBlocked(
          p,
          (tasksByProject.get(p.id) ?? []).filter((tk) => !tk.done && taskIsBlocked(tk))
            .length
        )
      ).length,
    [visibleProjects, tasksByProject]
  );

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
      const pt = tasksByProject.get(p.id) ?? [];
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
        case "cold": {
          // Frío primero: más días sin tocar arriba. `daysSinceTouch` lo deriva
          // el servidor; si no viene (forma cacheada vieja), cae a lastActivity.
          const da = a.daysSinceTouch ?? -recentTs(a);
          const db = b.daysSinceTouch ?? -recentTs(b);
          return db - da || byName(a, b);
        }
        case "category": {
          // Alfabético dentro del grupo. Aquí solo hace falta que los de la
          // misma categoría queden contiguos y de forma determinista.
          const ca = a.categoryId ?? "";
          const cb = b.categoryId ?? "";
          if (ca !== cb) {
            // Los sueltos al final: son el resto, no un grupo más.
            if (!ca) return 1;
            if (!cb) return -1;
            return ca.localeCompare(cb);
          }
          return byName(a, b);
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
  }, [filtered, tasksByProject, sortMode, i18n.language]);

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

  const onManualDragEnd = useCallback(
    ({ data }: { data: Project[] }) => {
      selectionFeedback();
      void reorderProjects(data.map((p) => p.id));
    },
    [reorderProjects]
  );

  const openProject = useCallback(
    (id: string) => router.push({ pathname: "/project/[id]", params: { id } }),
    [router]
  );

  const chipItems: FilterChipItem<StatusKey>[] = useMemo(
    () =>
      STATUS_FILTER_ORDER.filter((s) => s === "all" || (statusCounts[s] ?? 0) > 0).map(
        (s) => ({
          key: s as StatusKey,
          label: s === "all" ? t("status.all") : t(`status.${s}`),
          count: statusCounts[s] ?? 0,
        })
      ),
    [statusCounts, t]
  );

  // Flat list of rows for non-manual modes: section headers (Smart) interleaved
  // with project cards, walking the frozen layout so edits don't reshuffle.
  const listRows = useMemo(() => {
    const rows: ListRow[] = [];
    let currentSection: string | null = null;
    for (const entry of entries) {
      const p = projectById.get(entry.id);
      if (!p) continue;
      if (sortMode === "smart" && entry.section !== currentSection) {
        currentSection = entry.section;
        rows.push({
          type: "header",
          key: `sec-${entry.section}`,
          label: t(`views.projects.sections.${entry.section}`),
        });
      }
      rows.push({ type: "project", key: p.id, project: p });
    }
    return rows;
  }, [entries, projectById, sortMode, t]);

  const renderDraggable = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Project>) => (
      <ScaleDecorator>
        <View style={{ paddingBottom: 16 }}>
          <ProjectListItem
            project={item}
            projectTasks={tasksByProject.get(item.id)}
            categoryById={categoryById}
            totalEffortHours={hoursByProject.get(item.id)}
            onOpen={openProject}
            drag={drag}
            dragging={isActive}
          />
        </View>
      </ScaleDecorator>
    ),
    [tasksByProject, categoryById, hoursByProject, openProject]
  );

  const renderRow = useCallback(
    ({ item }: { item: ListRow }) =>
      item.type === "header" ? (
        <Meta variant="cintillo" tone="muted" className="px-1 pb-3 pt-2">
          {item.label}
        </Meta>
      ) : (
        <View style={{ paddingBottom: 16 }}>
          <ProjectListItem
            project={item.project}
            projectTasks={tasksByProject.get(item.project.id)}
            categoryById={categoryById}
            totalEffortHours={hoursByProject.get(item.project.id)}
            onOpen={openProject}
          />
        </View>
      ),
    [tasksByProject, categoryById, hoursByProject, openProject]
  );

  const outlineButton = (label: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      className="items-center justify-center rounded-md border px-4"
      style={{ borderColor: c.accent, height: SIZE.hit }}
    >
      <Text className="font-sans-medium" style={{ fontSize: 15, color: c.accent }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      {/* Admin announcements + derived alerts: en web viven sobre todas las
          vistas del dashboard, así que aquí también sobre cada pestaña. */}
      <NotificationStack className="gap-2 px-5 pt-2" />
      <View className="gap-4 px-5 pb-3 pt-3">
        <ScreenHeadline
          primary={t("views.projects.headline", { count: visibleProjects.length })}
          secondary={
            blockedTotal > 0
              ? t("views.projects.headlineBlocked", { count: blockedTotal })
              : null
          }
          secondaryTone="signal"
        />

        <View className="flex-row items-center gap-2">
          <View
            className="flex-1 flex-row items-center gap-2 rounded-lg border border-border bg-surface px-3"
            style={{ height: SIZE.hit }}
          >
            <Search size={18} color={c.text3} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("views.projects.searchShort")}
              accessibilityLabel={t("views.projects.search")}
              placeholderTextColor={c.text5}
              className="flex-1"
              style={{ color: c.text, fontSize: 16, height: SIZE.hit }}
            />
          </View>
          <Pressable
            onPress={() => setSortSheet(true)}
            accessibilityRole="button"
            accessibilityLabel={`${t("views.projects.sortAria")}: ${t(`views.projects.sortBy.${sortMode}`)}`}
            className="flex-row items-center gap-1.5 rounded-lg border border-border bg-surface px-3 active:opacity-70"
            style={{ height: SIZE.hit }}
          >
            <ArrowUpDown size={16} color={c.text3} />
            <Text
              className="font-sans-semibold uppercase"
              style={{ fontSize: 11, letterSpacing: 0.8, color: c.text3 }}
            >
              {t(`views.projects.sortBy.${sortMode}`)}
            </Text>
          </Pressable>
        </View>

        {visibleProjects.length > 0 ? (
          <FilterChips items={chipItems} value={statusFilter} onChange={setStatusFilter} />
        ) : null}
      </View>

      {initialLoading && visibleProjects.length === 0 ? (
        <ListSkeleton variant="card" />
      ) : visibleProjects.length === 0 ? (
        <View className="flex-1 px-5">
          <EmptyState
            title={t("views.projects.empty")}
            body={t("views.projects.emptyBody")}
            actions={outlineButton(t("modals.project.newTitle"), () =>
              router.push("/project-form")
            )}
          />
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 px-5">
          <EmptyState
            title={
              search.trim()
                ? t("views.projects.noMatchSearch", { query: search.trim() })
                : t("views.projects.noMatchFilters")
            }
            rule={t("views.projects.hiddenCount", {
              count: visibleProjects.length - filtered.length,
            })}
            actions={
              statusFilter !== "all" || search.trim()
                ? outlineButton(t("views.projects.clearFilters"), () => {
                    setStatusFilter("all");
                    setSearch("");
                  })
                : null
            }
          />
        </View>
      ) : manualDragEnabled ? (
        // (D) Drag to reorder — persisted as "Mi orden". Long-press sobre la
        // tarjeta entera; el ⠿ de la derecha es solo la afordancia.
        <GestureHandlerRootView style={{ flex: 1 }}>
          <DraggableFlatList
            data={sorted}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 96 }}
            onDragEnd={onManualDragEnd}
            renderItem={renderDraggable}
            {...LIST_PERF}
          />
        </GestureHandlerRootView>
      ) : (
        // (A/C) Frozen layout; Smart adds section headers. A stale banner lets
        // the user re-sort on demand instead of rows jumping mid-edit.
        <FlatList
          data={listRows}
          keyExtractor={(row) => row.key}
          contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 96 }}
          renderItem={renderRow}
          removeClippedSubviews
          {...LIST_PERF}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.accent}
            />
          }
          ListHeaderComponent={
            sortMode === "manual" ? (
              <View className="flex-row items-center gap-1.5 pb-3">
                <ArrowUpDown size={12} color={c.text3} />
                <Meta tone="muted">{t("views.projects.manualFilteredHint")}</Meta>
              </View>
            ) : isStale ? (
              <View
                className="mb-4 flex-row items-center justify-between gap-3 rounded-lg border px-3 py-2"
                style={{
                  borderColor: alpha(c.accent, 0.3),
                  backgroundColor: alpha(c.accent, 0.1),
                }}
              >
                <Text className="font-sans flex-1" style={{ fontSize: 15, color: c.text2 }}>
                  {t("views.projects.orderChanged")}
                </Text>
                <Pressable
                  onPress={resync}
                  className="flex-row items-center gap-1.5 rounded-md border px-3"
                  style={{ borderColor: alpha(c.accent, 0.3), height: SIZE.hit }}
                >
                  <ArrowUpDown size={14} color={c.accent} />
                  <Text className="font-sans-medium" style={{ fontSize: 14, color: c.accent }}>
                    {t("views.projects.reorder")}
                  </Text>
                </Pressable>
              </View>
            ) : null
          }
        />
      )}

      <BottomSheet
        visible={sortSheet}
        onClose={() => setSortSheet(false)}
        title={t("views.projects.sortSheet.title")}
      >
        <View>
          {PROJECT_SORT_MODES.map((m) => {
            const active = sortMode === m;
            return (
              <Pressable
                key={m}
                onPress={() => {
                  setSortMode(m);
                  setSortSheet(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                className="flex-row items-center justify-between rounded-lg px-3"
                style={{ minHeight: 48 }}
              >
                <Text
                  className={active ? "font-sans-medium" : "font-sans"}
                  style={{ fontSize: 16, color: active ? c.accent : c.text }}
                >
                  {t(`views.projects.sortBy.${m}`)}
                </Text>
                {active ? <Check size={18} color={c.accent} /> : null}
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
