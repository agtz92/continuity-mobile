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
import {
  CalendarPlus,
  CheckCircle2,
  Clock,
  ListFilter,
  Plus,
  Search,
  Target,
} from "lucide-react-native";
import type { Task } from "@/lib/types";
import {
  dueDateOnly,
  isDueToday,
  isOverdue,
  toLocalISO,
} from "@/lib/date";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { isDailyViewStatus } from "@/lib/projectStatus";
import { toast } from "@/lib/toast";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { ListSkeleton } from "@/components/ui/Skeletons";
import { FAB } from "@/components/ui/FAB";
import { TaskRow } from "@/components/tasks/TaskRow";
import {
  EMPTY_TASK_FILTER,
  TasksFilterSheet,
  type TaskFilterDraft,
} from "@/components/tasks/TasksFilterSheet";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

const RED = "239,68,68";
const ORANGE = "249,115,22";
const AMBER = "245,158,11";
const RED_T = "rgb(248,113,113)";
const ORANGE_T = "rgb(251,146,60)";
const AMBER_T = "rgb(251,191,36)";

type TaskRange = "today" | "week" | "all";

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

  const [showOverdue, setShowOverdue] = useState(true);
  const [showToday, setShowToday] = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [showUnscheduled, setShowUnscheduled] = useState(false);
  const [showDone, setShowDone] = useState(false);

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
  const projectStatusById = useMemo(
    () => new Map(projects.map((p) => [p.id, p.status])),
    [projects]
  );
  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (!task.projectId) return true;
        const status = projectStatusById.get(task.projectId);
        return status ? isDailyViewStatus(status) : true;
      }),
    [tasks, projectStatusById]
  );

  const matchesProject = (task: Task, d: TaskFilterDraft) =>
    d.projectIds.size === 0 || d.projectIds.has(task.projectId);
  const matchesCompleted = (task: Task, d: TaskFilterDraft) =>
    d.showCompleted || !task.done;
  const matchesBlocked = (task: Task, d: TaskFilterDraft) =>
    d.showBlocked || task.done || task.blockers.length === 0;

  const passesUserFilter = (task: Task) =>
    matchesProject(task, filter) &&
    matchesCompleted(task, filter) &&
    matchesBlocked(task, filter);

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
  const matchesSearch = (task: Task) => {
    if (!q) return true;
    const proj = projects.find((p) => p.id === task.projectId);
    return (
      task.title.toLowerCase().includes(q) ||
      (proj?.name.toLowerCase().includes(q) ?? false)
    );
  };

  const filteredTasks = useMemo(
    () =>
      visibleTasks.filter(
        (task) => matchesSearch(task) && passesUserFilter(task)
      ),
    [visibleTasks, projects, q, filter]
  );

  const buckets = useMemo(() => {
    const overdue = filteredTasks
      .filter((task) => !task.done && task.dueDate && isOverdue(task.dueDate))
      .sort(
        (a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
      );
    const today = filteredTasks
      .filter((task) => !task.done && task.dueDate && isDueToday(task.dueDate))
      .sort(
        (a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
      );
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
      .sort(
        (a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
      );
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

  const searching = q.length > 0;
  const overdueOpen = searching || showOverdue;
  const todayOpen = searching || showToday;
  const upcomingOpen = searching || showUpcoming;
  const unscheduledOpen = searching || showUnscheduled;
  const doneOpen = searching || showDone;

  const showUpcomingBucket = range !== "today";
  const showUnscheduledBucket = range === "all";
  const showDoneBucket = filter.showCompleted;

  // Tapping the "add date" affordance on an unscheduled row schedules it for
  // today. The full date picker lives in a later forms phase.
  const scheduleToday = (task: Task) =>
    saveTask({
      id: task.id,
      title: task.title,
      projectId: task.projectId,
      dueDate: toLocalISO(new Date()),
      done: task.done,
      effortHours: task.effortHours,
    });

  // Quick action on overdue rows: same write as scheduleToday, plus feedback.
  const moveTaskToToday = async (task: Task) => {
    const ok = await scheduleToday(task);
    if (ok) toast.success(t("taskRow.movedToast"), 2000);
  };

  const renderRow = (task: Task, canSchedule?: boolean) => (
    <TaskRow
      key={task.id}
      task={task}
      project={projects.find((p) => p.id === task.projectId)}
      onToggle={toggleTask}
      onDelete={deleteTask}
      onSchedule={canSchedule ? scheduleToday : undefined}
      onEdit={(tk) =>
        router.push({ pathname: "/task-form", params: { id: tk.id } })
      }
      onMoveToday={moveTaskToToday}
    />
  );

  const countPill = (n: number, base: string, text: string) => (
    <View
      className="rounded-full border px-2 py-0.5"
      style={{ backgroundColor: `rgba(${base},0.1)`, borderColor: `rgba(${base},0.3)` }}
    >
      <Text className="text-xs" style={{ color: text }}>
        {n}
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="gap-3 px-5 pb-3 pt-2">
        <Text className="text-2xl font-bold text-text">
          {t("views.tasks.title")}
        </Text>

        <View className="flex-row items-center gap-2 rounded-lg border border-border bg-surface px-3">
          <Search size={16} color={c.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("views.tasks.search")}
            placeholderTextColor={c.textMuted}
            className="flex-1 py-2.5"
            style={{ color: c.text }}
          />
        </View>

        {tasks.length > 0 && (
          <View className="flex-row items-center gap-2">
            <View className="flex-1 flex-row rounded-lg border border-border bg-surface p-0.5">
              {(["today", "week", "all"] as TaskRange[]).map((r) => {
                const active = range === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setRange(r)}
                    className={
                      "flex-1 items-center rounded-md px-2 py-1.5 " +
                      (active ? "bg-accent" : "")
                    }
                  >
                    <Text
                      className={
                        "text-sm font-medium " +
                        (active ? "text-bg" : "text-text-muted")
                      }
                    >
                      {t(`views.tasks.range.${r}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => setFilterSheet(true)}
              className="flex-row items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <ListFilter size={14} color={c.textMuted} />
              <Text className="text-sm text-text">
                {t("views.tasks.filterCta")}
              </Text>
              {activeFilterCount > 0 && (
                <View className="h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1">
                  <Text className="text-[10px] font-semibold text-bg">
                    {activeFilterCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        )}
      </View>

      {initialLoading && tasks.length === 0 ? (
        <ListSkeleton />
      ) : tasks.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-base text-center text-text-muted">
            {t("views.tasks.empty")}
          </Text>
        </View>
      ) : filteredTasks.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-base text-center text-text-muted">
            {searching
              ? t("views.tasks.noMatch", { query: search.trim() })
              : t("views.tasks.empty")}
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
          {buckets.overdue.length > 0 && (
            <CollapsibleSection
              variant="card"
              open={overdueOpen}
              onToggle={() => setShowOverdue((s) => !s)}
              icon={<Target size={14} color={RED_T} />}
              title={t("views.tasks.overdueBucket")}
              rightSlot={countPill(buckets.overdue.length, RED, RED_T)}
            >
              <View className="gap-2">
                {buckets.overdue.map((task) => renderRow(task))}
              </View>
            </CollapsibleSection>
          )}

          <CollapsibleSection
            variant="card"
            open={todayOpen}
            onToggle={() => setShowToday((s) => !s)}
            icon={<Target size={14} color={ORANGE_T} />}
            title={t("views.tasks.todayOnlyBucket")}
            rightSlot={
              <View className="flex-row items-center gap-1.5">
                {countPill(buckets.today.length, ORANGE, ORANGE_T)}
                {todayEffort > 0 && (
                  <View
                    className="flex-row items-center gap-1 rounded border px-2 py-0.5"
                    style={{
                      backgroundColor: alpha(c.accent2, 0.15),
                      borderColor: alpha(c.accent2, 0.3),
                    }}
                  >
                    <Clock size={10} color={c.accent2} />
                    <Text className="text-xs text-accent-2">{todayEffort}h</Text>
                  </View>
                )}
              </View>
            }
          >
            {buckets.today.length === 0 ? (
              <Text className="py-4 text-center text-sm text-text-muted">
                {t("views.tasks.todayEmpty")}
              </Text>
            ) : (
              <View className="gap-2">
                {buckets.today.map((task) => renderRow(task))}
              </View>
            )}
          </CollapsibleSection>

          {showUpcomingBucket && buckets.upcoming.length > 0 && (
            <CollapsibleSection
              variant="card"
              open={upcomingOpen}
              onToggle={() => setShowUpcoming((s) => !s)}
              icon={<Clock size={14} color={c.accent2} />}
              title={t("views.tasks.upcoming")}
              rightSlot={
                <View
                  className="rounded-full border px-2 py-0.5"
                  style={{
                    backgroundColor: alpha(c.accent2, 0.1),
                    borderColor: alpha(c.accent2, 0.3),
                  }}
                >
                  <Text className="text-xs text-accent-2">
                    {buckets.upcoming.length}
                  </Text>
                </View>
              }
            >
              <View className="gap-2">
                {buckets.upcoming.map((task) => renderRow(task))}
              </View>
            </CollapsibleSection>
          )}

          {showUnscheduledBucket && buckets.unscheduled.length > 0 && (
            <CollapsibleSection
              variant="card"
              open={unscheduledOpen}
              onToggle={() => setShowUnscheduled((s) => !s)}
              icon={<CalendarPlus size={14} color={AMBER_T} />}
              title={t("views.tasks.pickDay")}
              rightSlot={countPill(buckets.unscheduled.length, AMBER, AMBER_T)}
            >
              <View className="gap-2">
                {buckets.unscheduled.map((task) => renderRow(task, true))}
              </View>
            </CollapsibleSection>
          )}

          {showDoneBucket && buckets.done.length > 0 && (
            <CollapsibleSection
              variant="card"
              open={doneOpen}
              onToggle={() => setShowDone((s) => !s)}
              icon={<CheckCircle2 size={14} color={c.accent} />}
              title={t("views.tasks.completed")}
              rightSlot={
                <View
                  className="rounded-full border px-2 py-0.5"
                  style={{
                    backgroundColor: alpha(c.accent, 0.1),
                    borderColor: alpha(c.accent, 0.3),
                  }}
                >
                  <Text className="text-xs text-accent">{buckets.done.length}</Text>
                </View>
              }
            >
              <View className="gap-2">
                {buckets.done.map((task) => renderRow(task))}
              </View>
            </CollapsibleSection>
          )}
        </ScrollView>
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
