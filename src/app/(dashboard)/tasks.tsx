import { useCallback, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Pressable,
  RefreshControl,
  SectionList,
  Text,
  TextInput,
  View,
  type SectionListData,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NotificationStack } from "@/components/notifications/NotificationStack";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ListFilter, Plus, Search } from "lucide-react-native";
import type { Task } from "@/lib/types";
import { dueDateOnly, isDueToday, isOverdue, toLocalISO } from "@/lib/date";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { isDailyViewStatus } from "@/lib/projectStatus";
import { ScreenHeadline } from "@/components/ui/ScreenHeadline";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Segmented } from "@/components/ui/Segmented";
import { ListSkeleton } from "@/components/ui/Skeletons";
import { FAB } from "@/components/ui/FAB";
import { TaskRow } from "@/components/tasks/TaskRow";
import {
  EMPTY_TASK_FILTER,
  TasksFilterSheet,
  type TaskFilterDraft,
} from "@/components/tasks/TasksFilterSheet";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

type TaskRange = "today" | "week" | "all";
type BucketKey = "overdue" | "today" | "upcoming" | "unscheduled" | "done";

/** Fila centinela: el bucket "Today" abierto y vacío muestra su mensaje. */
const EMPTY_ROW = "__empty__" as const;
type Item = Task | typeof EMPTY_ROW;

type Bucket = {
  key: BucketKey;
  title: string;
  count: number;
  meta?: string;
  tone: "default" | "signal";
  open: boolean;
  data: Item[];
};

/**
 * Tasks (1i), rediseño "Breathe": titular con la cifra que importa, buscador +
 * Filter (44), segmentado Today/Week/All y buckets como cabecera plegable sobre
 * fondo plano (sin tarjeta exterior). Virtualizada con `SectionList`: la vista
 * "All" pasa con facilidad de 20 filas.
 */
export default function Tasks() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const router = useRouter();
  const { tasks, projects, initialLoading, refetch } = useDashboardData();
  const { toggleTask, deleteTask, saveTask } = useTaskMutations();

  const [search, setSearch] = useState("");
  const [range, setRange] = useState<TaskRange>("all");
  const [filter, setFilter] = useState<TaskFilterDraft>(EMPTY_TASK_FILTER);
  const [filterSheet, setFilterSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [openState, setOpenState] = useState<Record<BucketKey, boolean>>({
    overdue: true,
    today: true,
    upcoming: false,
    unscheduled: false,
    done: false,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const weekHorizonISO = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return toLocalISO(d);
  }, []);

  // Mirror web TasksView + Today/Calendar: tasks of a closed project
  // (paused/stalled/killed/archived) are withdrawn here; standalone tasks and
  // tasks of a live project stay. Manage closed-project tasks from the project
  // detail / graveyard instead.
  const projectById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );
  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (!task.projectId) return true;
        const status = projectById.get(task.projectId)?.status;
        return status ? isDailyViewStatus(status) : true;
      }),
    [tasks, projectById]
  );

  const matchesProject = (task: Task, d: TaskFilterDraft) =>
    d.projectIds.size === 0 || d.projectIds.has(task.projectId);
  const matchesCompleted = (task: Task, d: TaskFilterDraft) =>
    d.showCompleted || !task.done;
  const matchesBlocked = (task: Task, d: TaskFilterDraft) =>
    d.showBlocked || task.done || task.blockers.length === 0;

  const previewCount = (d: TaskFilterDraft) =>
    visibleTasks.filter(
      (task) =>
        matchesProject(task, d) &&
        matchesCompleted(task, d) &&
        matchesBlocked(task, d)
    ).length;

  const hasUnassigned = visibleTasks.some((task) => !task.projectId);
  const activeFilterCount =
    filter.projectIds.size +
    (filter.showCompleted ? 0 : 1) +
    (filter.showBlocked ? 0 : 1);

  const q = search.trim().toLowerCase();
  const searching = q.length > 0;

  const filteredTasks = useMemo(
    () =>
      visibleTasks.filter((task) => {
        if (
          !(
            matchesProject(task, filter) &&
            matchesCompleted(task, filter) &&
            matchesBlocked(task, filter)
          )
        )
          return false;
        if (!q) return true;
        const proj = task.projectId ? projectById.get(task.projectId) : undefined;
        return (
          task.title.toLowerCase().includes(q) ||
          (proj?.name.toLowerCase().includes(q) ?? false)
        );
      }),
    [visibleTasks, projectById, q, filter]
  );

  // Titular: cuenta lo abierto de verdad (sin búsqueda ni filtros).
  const headline = useMemo(() => {
    let open = 0;
    let overdue = 0;
    let today = 0;
    for (const task of visibleTasks) {
      if (task.done) continue;
      open += 1;
      if (isOverdue(task.dueDate)) overdue += 1;
      else if (isDueToday(task.dueDate)) today += 1;
    }
    return { open, overdue, today };
  }, [visibleTasks]);

  const buckets = useMemo(() => {
    const byDue = (a: Task, b: Task) =>
      new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime();
    const overdue = filteredTasks
      .filter((task) => !task.done && task.dueDate && isOverdue(task.dueDate))
      .sort(byDue);
    const today = filteredTasks
      .filter((task) => !task.done && task.dueDate && isDueToday(task.dueDate))
      .sort(byDue);
    const unscheduled = filteredTasks
      .filter((task) => !task.done && !task.dueDate)
      .sort(
        (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
      );
    const upcomingAll = filteredTasks
      .filter(
        (task) =>
          !task.done &&
          task.dueDate &&
          !isOverdue(task.dueDate) &&
          !isDueToday(task.dueDate)
      )
      .sort(byDue);
    const upcoming =
      range === "week"
        ? upcomingAll.filter((task) => dueDateOnly(task.dueDate!) <= weekHorizonISO)
        : upcomingAll;
    const done = filteredTasks
      .filter((task) => task.done)
      .sort((a, b) => {
        const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return tb - ta;
      });
    return { overdue, today, unscheduled, upcoming, done };
  }, [filteredTasks, range, weekHorizonISO]);

  const todayEffort =
    Math.round(
      buckets.today.reduce((sum, task) => sum + (task.effortHours ?? 0), 0) * 100
    ) / 100;

  const sections: Bucket[] = useMemo(() => {
    const isOpen = (k: BucketKey) => searching || openState[k];
    const out: Bucket[] = [];
    const push = (
      key: BucketKey,
      title: string,
      items: Task[],
      opts?: { tone?: "signal"; meta?: string; emptyRow?: boolean }
    ) => {
      const open = isOpen(key);
      out.push({
        key,
        title,
        count: items.length,
        meta: opts?.meta,
        tone: opts?.tone ?? "default",
        open,
        data: !open ? [] : items.length === 0 && opts?.emptyRow ? [EMPTY_ROW] : items,
      });
    };
    if (buckets.overdue.length > 0)
      push("overdue", t("views.tasks.overdueBucket"), buckets.overdue, {
        tone: "signal",
      });
    push("today", t("views.tasks.todayOnlyBucket"), buckets.today, {
      meta: todayEffort > 0 ? `${todayEffort}h` : undefined,
      emptyRow: true,
    });
    if (range !== "today" && buckets.upcoming.length > 0)
      push("upcoming", t("views.tasks.upcoming"), buckets.upcoming);
    if (range === "all" && buckets.unscheduled.length > 0)
      push("unscheduled", t("views.tasks.pickDay"), buckets.unscheduled);
    if (filter.showCompleted && buckets.done.length > 0)
      push("done", t("views.tasks.completed"), buckets.done);
    return out;
  }, [buckets, openState, searching, range, filter.showCompleted, todayEffort, t]);

  const toggleBucket = useCallback(
    (key: BucketKey) => setOpenState((s) => ({ ...s, [key]: !s[key] })),
    []
  );

  // "Add date" en una fila sin fecha la programa para hoy; el selector completo
  // vive en la edición.
  const scheduleToday = useCallback(
    (task: Task) =>
      saveTask({
        id: task.id,
        title: task.title,
        projectId: task.projectId,
        dueDate: toLocalISO(new Date()),
        done: task.done,
        effortHours: task.effortHours,
      }),
    [saveTask]
  );
  const openEdit = useCallback(
    (tk: Task) => router.push({ pathname: "/task-form", params: { id: tk.id } }),
    [router]
  );

  const renderItem = ({
    item,
    section,
  }: {
    item: Item;
    section: SectionListData<Item, Bucket>;
  }) => {
    if (item === EMPTY_ROW) {
      return (
        <Text
          className="font-sans text-center"
          style={{ fontSize: 15, color: c.text3, paddingVertical: 16 }}
        >
          {t("views.tasks.todayEmpty")}
        </Text>
      );
    }
    return (
      <View style={{ marginBottom: 10 }}>
        <TaskRow
          task={item}
          project={item.projectId ? projectById.get(item.projectId) : undefined}
          onToggle={toggleTask}
          onDelete={deleteTask}
          onSchedule={section.key === "unscheduled" ? scheduleToday : undefined}
          onEdit={openEdit}
        />
      </View>
    );
  };

  const renderSectionHeader = ({
    section,
  }: {
    section: SectionListData<Item, Bucket>;
  }) => (
    <View style={{ paddingTop: 12, paddingBottom: section.open ? 6 : 0 }}>
      <View style={{ height: 1, backgroundColor: c.line[14], marginBottom: 4 }} />
      <SectionHeader
        title={section.title}
        meta={section.meta}
        open={section.open}
        onToggle={() => toggleBucket(section.key)}
        tone={section.tone}
        trailing={
          <Text
            className="font-sans-semibold"
            style={{
              fontSize: 15,
              fontVariant: ["tabular-nums"],
              color: section.tone === "signal" ? c.signal : c.text3,
            }}
          >
            {section.count}
          </Text>
        }
      />
    </View>
  );

  const header = (
    <View style={{ gap: 12, paddingBottom: 4 }}>
      <ScreenHeadline
        primary={t("views.tasks.headline.open", { count: headline.open })}
        secondary={
          headline.overdue > 0
            ? t("views.tasks.headline.overdue", { count: headline.overdue })
            : headline.today > 0
              ? t("views.tasks.headline.dueToday", { count: headline.today })
              : null
        }
        secondaryTone={headline.overdue > 0 ? "signal" : "muted"}
      />

      <View className="flex-row items-center" style={{ gap: 8 }}>
        <View
          className="min-w-0 flex-1 flex-row items-center rounded-lg border border-border bg-surface"
          style={{ height: SIZE.hit, paddingHorizontal: 12, gap: 8 }}
        >
          <Search size={18} color={c.text3} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("views.tasks.search")}
            placeholderTextColor={c.text5}
            accessibilityLabel={t("views.tasks.search")}
            className="flex-1"
            style={{ color: c.text, fontSize: 16, height: SIZE.hit }}
          />
        </View>
        {tasks.length > 0 ? (
          <Pressable
            onPress={() => setFilterSheet(true)}
            accessibilityRole="button"
            accessibilityLabel={t("views.tasks.filterCta")}
            className="flex-row items-center rounded-lg border border-border bg-surface active:opacity-70"
            style={{ height: SIZE.hit, paddingHorizontal: 12, gap: 6 }}
          >
            <ListFilter size={18} color={c.text3} />
            <Text className="font-sans-medium" style={{ fontSize: 15, color: c.text }}>
              {t("views.tasks.filterCta")}
            </Text>
            {activeFilterCount > 0 ? (
              <View
                className="items-center justify-center rounded-full"
                style={{ minWidth: 22, height: 22, paddingHorizontal: 6, backgroundColor: c.accent }}
              >
                <Text className="font-sans-semibold" style={{ fontSize: 12, color: c.bg }}>
                  {activeFilterCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>

      {tasks.length > 0 ? (
        <Segmented<TaskRange>
          options={[
            { value: "today", label: t("views.tasks.range.today") },
            { value: "week", label: t("views.tasks.range.week") },
            { value: "all", label: t("views.tasks.range.all") },
          ]}
          value={range}
          onChange={setRange}
        />
      ) : null}
    </View>
  );

  // Carga y lista vacía de origen se pintan fuera de la lista. "Sin
  // coincidencias" vive DENTRO (ListEmptyComponent): si saliera, el buscador
  // se remontaría a media escritura y cerraría el teclado.
  const body = () => {
    if (initialLoading && tasks.length === 0) return <ListSkeleton />;
    if (tasks.length === 0)
      return (
        <EmptyState title={t("views.tasks.empty")} body={t("views.tasks.emptyBody")} />
      );
    return null;
  };
  const fallback = body();

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      {/* Admin announcements + derived alerts: en web viven sobre todas las
          vistas del dashboard, así que aquí también sobre cada pestaña. */}
      <NotificationStack className="gap-2 px-5 pt-2" />

      {fallback ? (
        <View className="flex-1" style={{ paddingHorizontal: SIZE.gutter, paddingTop: 8 }}>
          {header}
          {fallback}
        </View>
      ) : (
        <SectionList<Item, Bucket>
          sections={filteredTasks.length === 0 ? [] : sections}
          ListEmptyComponent={
            <EmptyState
              title={
                searching
                  ? t("views.tasks.noMatch", { query: search.trim() })
                  : t("views.tasks.empty")
              }
            />
          }
          keyExtractor={(item) => (item === EMPTY_ROW ? EMPTY_ROW : item.id)}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          // Elemento, no componente inline: el TextInput del buscador no se
          // remonta al teclear.
          ListHeaderComponent={header}
          contentContainerStyle={{
            paddingHorizontal: SIZE.gutter,
            paddingTop: 8,
            paddingBottom: 112,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.accent}
            />
          }
        />
      )}

      <TasksFilterSheet
        visible={filterSheet}
        initial={filter}
        projects={projects}
        hasUnassigned={hasUnassigned}
        previewCount={previewCount}
        onApply={setFilter}
        onClose={() => setFilterSheet(false)}
      />

      <FAB
        icon={<Plus size={26} color={c.bg} />}
        label={t("modals.task.newTitle")}
        onPress={() => router.push("/task-form")}
      />
    </SafeAreaView>
  );
}
