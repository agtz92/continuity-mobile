import { Fragment, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react-native";

import {
  computeTodayRoutineItems,
  routineCounts,
  routineEffortHours,
} from "@/components/today/todayRoutines";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useTodayFocus } from "@/hooks/useTodayFocus";
import { useProductivityStats } from "@/hooks/useProductivityStats";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { useRoutineMutations } from "@/hooks/useRoutineMutations";
import { useTodayLayout } from "@/hooks/useTodayLayout";
import type { TodaySectionId } from "@/lib/todaySections";
import { consumeCustomizeRequest, subscribeCustomize } from "@/lib/tour";
import { FAB } from "@/components/ui/FAB";
import { TodaySkeleton } from "@/components/ui/Skeletons";
import { NotificationStack } from "@/components/notifications/NotificationStack";
import { HiddenSectionsFooter } from "@/components/today/HiddenSectionsFooter";
import { TodayFocusSection } from "@/components/today/TodayFocusSection";
import { DoneTodaySection } from "@/components/today/DoneTodaySection";
import { TodayHeader } from "@/components/today/TodayHeader";
import { TodayCreateSheet } from "@/components/today/TodayCreateSheet";
import { TodayLayoutEditor } from "@/components/today/TodayLayoutEditor";
import { StalledQueue } from "@/components/today/StalledQueue";
import {
  ActiveProjectsSection,
  CloseableSection,
  CountersSection,
  LaunchedWithTasksSection,
  RoutinesTodaySection,
  SleepingSection,
  StaleIdeasSection,
  StalledAlertSection,
} from "@/components/today/sections";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Pantalla "Hoy": tablero de entrada. Compone secciones derivadas de los hooks
 * de dashboard; cada una existe solo si tiene datos, y `useTodayLayout` manda
 * el orden y la visibilidad. La pantalla compone, los componentes de
 * `components/today/` renderizan y los hooks calculan.
 */
export default function Today() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const {
    projects,
    tasks,
    ideas,
    activities,
    notesByProject,
    routines,
    routineOccurrences,
    categoryById,
    initialLoading,
    refetch,
  } = useDashboardData();

  const projectNotes = useMemo(() => Object.values(notesByProject).flat(), [notesByProject]);
  const focus = useTodayFocus({
    projects,
    tasks,
    activities,
    projectNotes,
    routines,
    routineOccurrences,
  });
  const stats = useProductivityStats({ projects, tasks, ideas, activities });
  const { toggleTask } = useTaskMutations();
  const { completeOccurrence, uncompleteOccurrence } = useRoutineMutations();
  const layout = useTodayLayout();

  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // Paso 5 del onboarding: abre el editor de layout si quedó armado.
  useEffect(() => {
    if (consumeCustomizeRequest()) layout.setEditMode(true);
    return subscribeCustomize(() => layout.setEditMode(true));
    // layout.setEditMode es un setter estable de useState: suscribirse una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al volver de un formulario, lo recién creado aparece sin pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      refetch().catch(() => undefined);
    }, [refetch]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const jumpToProject = useCallback(
    (id: string) => router.push({ pathname: "/project/[id]", params: { id } }),
    [router],
  );

  const routineItems = useMemo(
    () => computeTodayRoutineItems(routines, routineOccurrences),
    [routines, routineOccurrences],
  );

  if (initialLoading) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <TodaySkeleton />
      </SafeAreaView>
    );
  }

  if (layout.editMode) {
    return (
      <TodayLayoutEditor
        layout={layout}
        onExit={() => {
          layout.setEditMode(false);
          refetch().catch(() => undefined);
        }}
      />
    );
  }

  const hasData =
    projects.length > 0 || tasks.length > 0 || ideas.length > 0 || routines.length > 0;
  const activeProjects = projects.filter((p) => p.status === "active");
  const { closableProjects } = stats;
  const projectCardProps = {
    categoryById,
    projectProgressById: stats.projectProgressById,
    comebackProjectIds: stats.comebackProjectIds,
    comebackGapByProject: stats.comebackGapByProject,
    jumpToProject,
  };

  // Cada sección existe solo si tiene datos; la posición la decide el layout.
  const sections: Partial<Record<TodaySectionId, ReactNode>> = {};
  if (hasData) {
    sections.counters = (
      <CountersSection
        counters={[
          { id: "active", label: t("views.today.counters.active"), value: activeProjects.length, tint: c.accent },
          { id: "launched", label: t("views.today.counters.launched"), value: projects.filter((p) => p.status === "launched").length, tint: c.closed },
          { id: "stalled", label: t("views.today.counters.stalled"), value: focus.stalled.length, tint: c.accent },
          { id: "ideas", label: t("views.today.counters.ideas"), value: ideas.length, tint: c.text3 },
          { id: "tasks", label: t("views.today.counters.tasks"), value: tasks.length, tint: c.text },
        ]}
      />
    );
  }
  if (focus.stalled.length > 0) {
    sections["stalled-alert"] = (
      <StalledAlertSection stalled={focus.stalled} jumpToProject={jumpToProject} />
    );
  }
  sections["today-focus"] = (
    <TodayFocusSection
      todayFocus={focus.todayFocus}
      todayTaskCounts={focus.todayTaskCounts}
      todayEffortHours={focus.todayEffortHours}
      projects={projects}
      toggleTask={toggleTask}
      jumpToProject={jumpToProject}
    />
  );
  if (routineItems.length > 0) {
    sections["routines-today"] = (
      <RoutinesTodaySection
        todayRoutineItems={routineItems}
        todayRoutineCounts={routineCounts(routineItems)}
        todayRoutineEffortHours={routineEffortHours(routineItems)}
        projects={projects}
        categoryById={categoryById}
        completeOccurrence={completeOccurrence}
        uncompleteOccurrence={uncompleteOccurrence}
      />
    );
  }
  if (focus.doneTodayItems.length > 0) {
    sections["done-today"] = (
      <DoneTodaySection
        doneTodayItems={focus.doneTodayItems}
        doneTodayEffortHours={focus.doneTodayEffortHours}
        todayHoursByProject={stats.todayHoursByProject}
        projects={projects}
        jumpToProject={jumpToProject}
        toggleTask={toggleTask}
        uncompleteOccurrence={uncompleteOccurrence}
      />
    );
  }
  if (closableProjects.quickWins.length + closableProjects.almostThere.length > 0) {
    sections.closeable = (
      <CloseableSection closableProjects={closableProjects} jumpToProject={jumpToProject} />
    );
  }
  if (stats.stalledProjects.length > 0) {
    sections.sleeping = (
      <SleepingSection stalledProjects={stats.stalledProjects} jumpToProject={jumpToProject} />
    );
  }
  if (stats.staleIdeas.length > 0) {
    sections["stale-ideas"] = <StaleIdeasSection staleIdeas={stats.staleIdeas} />;
  }
  if (activeProjects.length > 0) {
    sections["active-projects"] = (
      <ActiveProjectsSection {...projectCardProps} activeProjects={activeProjects} tasks={tasks} />
    );
  }
  if (focus.launchedWithOpenTasks.length > 0) {
    sections["launched-with-tasks"] = (
      <LaunchedWithTasksSection
        {...projectCardProps}
        launchedWithOpenTasks={focus.launchedWithOpenTasks}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ gap: SIZE.sectionGap, padding: SIZE.gutter, paddingBottom: 96 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />
        }
      >
        {/* Avisos del admin + alertas derivadas (espejo de la web). */}
        <NotificationStack />
        <TodayHeader onCustomize={() => layout.setEditMode(true)} />
        {layout.order
          .filter((id) => !layout.hidden.has(id))
          .map((id) => (sections[id] ? <Fragment key={id}>{sections[id]}</Fragment> : null))}
        <HiddenSectionsFooter
          count={layout.hidden.size}
          onCustomize={() => layout.setEditMode(true)}
          label={t("views.today.customize.hiddenFooter", { count: layout.hidden.size })}
        />
      </ScrollView>

      <FAB
        icon={<Plus size={26} color={c.bg} />}
        label={t("views.today.createMenu.title")}
        onPress={() => setCreateOpen(true)}
      />
      <TodayCreateSheet visible={createOpen} onClose={() => setCreateOpen(false)} />
      <StalledQueue stalled={focus.stalled} />
    </SafeAreaView>
  );
}
