import {
  Fragment,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import DraggableFlatList, {
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Flag,
  FolderPlus,
  Lightbulb,
  Moon,
  Plus,
  Repeat,
  Rocket,
  Settings2,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react-native";
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
import {
  TODAY_SECTIONS,
  type TodaySectionId,
  type TodaySectionMeta,
} from "@/lib/todaySections";
import { FAB } from "@/components/ui/FAB";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { TodaySkeleton } from "@/components/ui/Skeletons";
import {
  StalledProjectModal,
  type StalledChoice,
} from "@/components/projects/StalledProjectModal";
import {
  PauseProjectModal,
  type PauseNotes,
} from "@/components/projects/PauseProjectModal";
import {
  KillProjectModal,
  type KillNotes,
} from "@/components/projects/KillProjectModal";
import { useProjectClosure } from "@/hooks/useProjectClosure";
import { consumeCustomizeRequest, subscribeCustomize } from "@/lib/tour";
import { TodaySectionEditRow } from "@/components/today/TodaySectionEditRow";
import { TodayCustomizeBar } from "@/components/today/TodayCustomizeBar";
import { HiddenSectionsFooter } from "@/components/today/HiddenSectionsFooter";
import { TodayFocusSection } from "@/components/today/TodayFocusSection";
import { DoneTodaySection } from "@/components/today/DoneTodaySection";
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
import { NotificationStack } from "@/components/notifications/NotificationStack";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

/**
 * Pantalla "Hoy": tablero de entrada de la app. Orquesta 10+ secciones derivadas
 * de los hooks de dashboard (foco del día, rutinas, completadas hoy, proyectos
 * cerrables, dormidos, ideas viejas, activos y lanzados) más la cola de decisión
 * de proyectos stalled, el modo de personalización del orden/visibilidad de
 * secciones y el FAB de creación.
 *
 * TODO: refactor — extraer TodaySectionRenderer + StalledProjectQueue + hook
 * useTodayCalculations; mover colores/horizontes a theme/colors.ts y
 * lib/dateConstants.ts (ver AUDITORIA_CODIGO.md).
 */

// Tuplas RGB "r,g,b" (sin envolver en rgb()) para poder componer alphas inline
// vía `rgba(${RED},0.3)`. Los *_T son los hex tintados ya resueltos para texto/
// iconos. Hardcodeadas porque no dependen del tema (semáforo overdue/today/idle).
const RED = "239,68,68";
const ORANGE = "249,115,22";
const AMBER = "245,158,11";
const PURPLE = "168,85,247";
const RED_T = "rgb(248,113,113)";
const ORANGE_T = "rgb(251,146,60)";
const AMBER_T = "rgb(251,191,36)";
const PURPLE_T = "rgb(192,132,252)";


function greetingKey(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 19) return "afternoon";
  return "evening";
}

const MOBILE_ONLY_SECTIONS: ReadonlySet<TodaySectionId> = new Set([
  // Mobile is the primary surface, so nothing is technically "mobile-only"
  // here — but keeping the type around lets the row component show a badge
  // if we add web-only sections later.
]);

/** Row in the FAB "create" chooser: tinted icon badge + label. */
function CreateOption({
  icon,
  tint,
  label,
  onPress,
}: {
  icon: ReactNode;
  tint: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center gap-3 rounded-xl px-3 py-3 active:bg-border"
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: tint }}
      >
        {icon}
      </View>
      <Text className="text-base font-medium text-text">{label}</Text>
    </Pressable>
  );
}

/**
 * Componente raíz de la pantalla "Hoy". Consume los hooks de datos/derivados,
 * arma cada sección como nodo en `sectionNodes` (solo si tiene datos) y los
 * renderiza en el orden/visibilidad que dicta `useTodayLayout`. Maneja además la
 * cola de proyectos stalled (un modal a la vez) y el modo de edición de layout.
 */
export default function Today() {
  const { t, i18n } = useTranslation();
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

  const projectNotes = useMemo(
    () => Object.values(notesByProject).flat(),
    [notesByProject]
  );

  const {
    stalled,
    todayFocus,
    todayTaskCounts,
    todayEffortHours,
    doneTodayItems,
    doneTodayEffortHours,
    launchedWithOpenTasks,
  } = useTodayFocus({
    projects,
    tasks,
    activities,
    projectNotes,
    routines,
    routineOccurrences,
  });

  const {
    stalledProjects,
    closableProjects,
    staleIdeas,
    todayHoursByProject,
    projectProgressById,
    comebackProjectIds,
    comebackGapByProject,
  } = useProductivityStats({ projects, tasks, ideas, activities });

  const { toggleTask } = useTaskMutations();
  const { completeOccurrence, uncompleteOccurrence } = useRoutineMutations();
  const closure = useProjectClosure();

  // Stalled decision queue: one modal per stalled project, in order. Projects
  // the user has already resolved (or chose to skip) this session are tracked
  // so they don't re-appear until the next reload.
  const [resolvedStalledIds, setResolvedStalledIds] = useState<Set<string>>(
    new Set()
  );
  const stalledQueue = stalled.filter((p) => !resolvedStalledIds.has(p.id));
  const currentStalled = stalledQueue[0] ?? null;
  const [stalledPauseOpen, setStalledPauseOpen] = useState(false);
  const [stalledKillOpen, setStalledKillOpen] = useState(false);

  const markStalledResolved = (id: string) =>
    setResolvedStalledIds((prev) => new Set(prev).add(id));

  // Despacha la elección del modal de stalled: "active" resuelve de inmediato
  // (muta status vía closure y saca el proyecto de la cola); "pause"/"kill"
  // abren su modal de notas, que confirma y resuelve recién al guardar.
  const onStalledChoice = (choice: StalledChoice) => {
    if (!currentStalled) return;
    if (choice === "active") {
      void closure.setStatus(currentStalled, "active");
      markStalledResolved(currentStalled.id);
    } else if (choice === "pause") {
      setStalledPauseOpen(true);
    } else {
      setStalledKillOpen(true);
    }
  };

  const onStalledPause = async (notes: PauseNotes) => {
    if (!currentStalled) return;
    const ok = await closure.pause(currentStalled, notes);
    if (ok) {
      setStalledPauseOpen(false);
      markStalledResolved(currentStalled.id);
    }
  };

  const onStalledKill = async (notes: KillNotes) => {
    if (!currentStalled) return;
    const ok = await closure.kill(currentStalled, notes);
    if (ok) {
      setStalledKillOpen(false);
      markStalledResolved(currentStalled.id);
    }
  };

  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const layout = useTodayLayout();

  // Hand-off from onboarding step 5: open the layout editor when armed. The
  // requester (onboarding) sets a one-shot flag before navigating here; we
  // consume it on mount and also subscribe in case Today is already mounted.
  useEffect(() => {
    if (consumeCustomizeRequest()) layout.setEditMode(true);
    return subscribeCustomize(() => layout.setEditMode(true));
    // layout.setEditMode is a stable useState setter — subscribe once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goCreate = (route: "/project-form" | "/task-form" | "/routine-form" | "/idea-form") => {
    setCreateOpen(false);
    router.push(route);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  // Refetch whenever the Today screen comes into focus — so navigating back
  // from a form (task-form, project-form, etc.) shows the newly created
  // item without requiring a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      refetch().catch(() => undefined);
    }, [refetch])
  );

  const exitEditAndRefresh = () => {
    layout.setEditMode(false);
    refetch().catch(() => undefined);
  };

  const jumpToProject = (id: string) =>
    router.push({ pathname: "/project/[id]", params: { id } });

  const hasData =
    projects.length > 0 ||
    tasks.length > 0 ||
    ideas.length > 0 ||
    routines.length > 0;

  // Rutinas pendientes hoy + agregados; la lógica vive en ../../../components/today/todayRoutines.
  const todayRoutineItems = useMemo(
    () => computeTodayRoutineItems(routines, routineOccurrences),
    [routines, routineOccurrences]
  );
  const todayRoutineCounts = useMemo(
    () => routineCounts(todayRoutineItems),
    [todayRoutineItems]
  );
  const todayRoutineEffortHours = useMemo(
    () => routineEffortHours(todayRoutineItems),
    [todayRoutineItems]
  );

  const closableTotal =
    closableProjects.quickWins.length + closableProjects.almostThere.length;
  const activeProjects = projects.filter((p) => p.status === "active");
  const launchedCount = projects.filter((p) => p.status === "launched").length;

  // Tarjetas-resumen de la cinta horizontal superior (un conteo global por tipo).
  const counters: { id: string; label: string; value: number; tint: string }[] =
    [
      { id: "active", label: t("views.today.counters.active"), value: activeProjects.length, tint: c.accent },
      { id: "launched", label: t("views.today.counters.launched"), value: launchedCount, tint: c.accent2 },
      { id: "stalled", label: t("views.today.counters.stalled"), value: stalled.length, tint: AMBER_T },
      { id: "ideas", label: t("views.today.counters.ideas"), value: ideas.length, tint: PURPLE_T },
      { id: "tasks", label: t("views.today.counters.tasks"), value: tasks.length, tint: c.text },
    ];

  const formattedDate = new Date().toLocaleDateString(i18n.language, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });


  // -------- Section icon map for the customize-mode row -------- //
  const SECTION_ICON: Record<TodaySectionId, ReactNode> = {
    counters: <TrendingUp size={18} color={c.accent2} />,
    "stalled-alert": <Bell size={18} color={AMBER_T} />,
    "today-focus": <Target size={18} color={c.accent} />,
    "routines-today": <Repeat size={18} color={c.accent2} />,
    "done-today": <Sparkles size={18} color={c.accent} />,
    closeable: <Flag size={18} color={c.accent} />,
    sleeping: <Moon size={18} color={AMBER_T} />,
    "stale-ideas": <Lightbulb size={18} color={PURPLE_T} />,
    "active-projects": <Zap size={18} color={c.accent} />,
    "launched-with-tasks": <Rocket size={18} color={c.accent2} />,
  };

  // -------- Section nodes (rendered only when data exists) -------- //
  // Cada sección se construye como nodo en este mapa y SOLO si tiene datos; el
  // render final (más abajo) recorre `layout.order`, filtra ocultas y pinta los
  // nodos presentes. Supuesto: el hook de layout es la única fuente de orden y
  // visibilidad — aquí solo decidimos existencia por datos, nunca posición.
  const sectionNodes: Partial<Record<TodaySectionId, ReactNode>> = {};

  // Sección: counters — cinta horizontal de totales globales (siempre visible si
  // hay algún dato).
  if (hasData) {
    sectionNodes.counters = <CountersSection counters={counters} />;
  }

  // Sección: stalled-alert — banner ámbar con los proyectos detenidos; cada chip
  // navega al proyecto. Es distinta de la cola de modales de decisión (más abajo).
  if (stalled.length > 0) {
    sectionNodes["stalled-alert"] = (
      <StalledAlertSection stalled={stalled} jumpToProject={jumpToProject} />
    );
  }

  // Sección: today-focus — lista priorizada de qué atender hoy (overdue / due
  // today / stalled / next step). Siempre presente (incluso vacía muestra hint).
  sectionNodes["today-focus"] = (
    <TodayFocusSection
      todayFocus={todayFocus}
      todayTaskCounts={todayTaskCounts}
      todayEffortHours={todayEffortHours}
      projects={projects}
      toggleTask={toggleTask}
      jumpToProject={jumpToProject}
    />
  );

  // Sección: routines-today — ocurrencias de rutina pendientes/atrasadas; cada
  // fila puede completar/descompletar in situ (muta vía useRoutineMutations).
  if (todayRoutineItems.length > 0) {
    sectionNodes["routines-today"] = (
      <RoutinesTodaySection
        todayRoutineItems={todayRoutineItems}
        todayRoutineCounts={todayRoutineCounts}
        todayRoutineEffortHours={todayRoutineEffortHours}
        projects={projects}
        categoryById={categoryById}
        completeOccurrence={completeOccurrence}
        uncompleteOccurrence={uncompleteOccurrence}
      />
    );
  }

  // Sección: done-today — lo completado hoy (tareas, rutinas y logs/notas)
  // unificado, con filtro task/log y horas por proyecto. Permite deshacer.
  if (doneTodayItems.length > 0) {
    sectionNodes["done-today"] = (
      <DoneTodaySection
        doneTodayItems={doneTodayItems}
        doneTodayEffortHours={doneTodayEffortHours}
        todayHoursByProject={todayHoursByProject}
        projects={projects}
        jumpToProject={jumpToProject}
        toggleTask={toggleTask}
        uncompleteOccurrence={uncompleteOccurrence}
      />
    );
  }

  // Sección: closeable — proyectos a punto de cerrarse: "almost there" (con
  // barra de % de avance) y "quick wins" (pocas tareas para terminar).
  if (closableTotal > 0) {
    sectionNodes.closeable = (
      <CloseableSection closableProjects={closableProjects} jumpToProject={jumpToProject} />
    );
  }

  // Sección: sleeping — proyectos "dormidos" (inactivos N días), con punto de
  // color según el bucket de inactividad (7-14 / 15-30 / 30+). Acción: reanudar.
  if (stalledProjects.length > 0) {
    sectionNodes.sleeping = (
      <SleepingSection stalledProjects={stalledProjects} jumpToProject={jumpToProject} />
    );
  }

  // Sección: stale-ideas — banner morado que invita a revisar ideas viejas;
  // tap lleva a la bandeja de ideas.
  if (staleIdeas.length > 0) {
    sectionNodes["stale-ideas"] = <StaleIdeasSection staleIdeas={staleIdeas} />;
  }

  // Sección: active-projects — proyectos en curso como tarjetas compactas con
  // stats de esfuerzo y resaltado de "comeback" (regreso tras una pausa).
  if (activeProjects.length > 0) {
    sectionNodes["active-projects"] = (
      <ActiveProjectsSection
        activeProjects={activeProjects}
        tasks={tasks}
        categoryById={categoryById}
        projectProgressById={projectProgressById}
        comebackProjectIds={comebackProjectIds}
        comebackGapByProject={comebackGapByProject}
        jumpToProject={jumpToProject}
      />
    );
  }

  // Sección: launched-with-tasks — proyectos ya lanzados que aún tienen tareas
  // abiertas (mantenimiento post-lanzamiento), como tarjetas compactas.
  if (launchedWithOpenTasks.length > 0) {
    sectionNodes["launched-with-tasks"] = (
      <LaunchedWithTasksSection
        launchedWithOpenTasks={launchedWithOpenTasks}
        categoryById={categoryById}
        projectProgressById={projectProgressById}
        comebackProjectIds={comebackProjectIds}
        comebackGapByProject={comebackGapByProject}
        jumpToProject={jumpToProject}
      />
    );
  }

  // -------- Customize mode UI -------- //

  const hideLabels = {
    show: t("views.today.customize.show"),
    hide: t("views.today.customize.hide"),
    locked: t("views.today.customize.alwaysVisible"),
    drag: t("views.today.customize.dragToReorder"),
  };

  // Filas del editor de layout en el orden actual del usuario: mapea cada id a su
  // metadata y descarta ids huérfanos (secciones removidas del catálogo).
  const editRows: TodaySectionMeta[] = layout.order
    .map((id) => TODAY_SECTIONS.find((s) => s.id === id))
    .filter((s): s is TodaySectionMeta => Boolean(s));

  const renderEditItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<TodaySectionMeta>) => (
    <View className="mb-2">
      <TodaySectionEditRow
        icon={SECTION_ICON[item.id]}
        label={t(`views.today.sections.${item.labelKey}`)}
        badge={
          MOBILE_ONLY_SECTIONS.has(item.id)
            ? t("views.today.customize.mobileOnly")
            : undefined
        }
        hidden={layout.hidden.has(item.id)}
        hideable={item.hideable}
        isActive={isActive}
        onToggleHide={() => layout.toggleVisibility(item.id)}
        onLongPressDrag={drag}
        labels={hideLabels}
      />
    </View>
  );

  // -------- Render -------- //

  // First load (no data yet): show a spinner instead of the fully-built empty
  // sections, which otherwise flash blank until the dashboard query resolves.
  if (initialLoading) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <TodaySkeleton />
      </SafeAreaView>
    );
  }

  // Modo edición de layout: reemplaza toda la pantalla por una lista arrastrable
  // para reordenar/ocultar secciones; al salir se refresca para reflejar cambios.
  if (layout.editMode) {
    return (
      <GestureHandlerRootView className="flex-1 bg-bg">
        <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
          <TodayCustomizeBar
            onExit={exitEditAndRefresh}
            onReset={layout.reset}
            labels={{
              title: t("views.today.customize.title"),
              close: t("views.today.customize.close"),
              reset: t("views.today.customize.reset"),
              done: t("views.today.customize.done"),
            }}
          />
          <DraggableFlatList
            data={editRows}
            keyExtractor={(it) => it.id}
            renderItem={renderEditItem}
            onDragEnd={({ data }) =>
              layout.setOrderDirect(data.map((it) => it.id))
            }
            contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          />
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ gap: 24, padding: 20, paddingBottom: 96 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.accent}
          />
        }
      >
        {/* Admin announcements + derived alerts (mirrors web NotificationStack) */}
        <NotificationStack />

        {/* Header: date + greeting + assistant trigger + customize */}
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-xs capitalize text-text-muted">
              {formattedDate}
            </Text>
            <Text className="mt-0.5 text-2xl font-semibold text-text">
              {t(`views.today.greeting.${greetingKey()}`)}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/assistant")}
            accessibilityRole="button"
            accessibilityLabel={t("assistant.openTooltip")}
            className="flex-row items-center gap-1.5 rounded-full border px-3 py-2"
            style={{
              backgroundColor: alpha(c.accent, 0.1),
              borderColor: alpha(c.accent, 0.3),
            }}
          >
            <Sparkles size={16} color={c.accent} />
            <Text className="text-xs font-medium text-accent">
              {t("assistant.buttonLabel")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => layout.setEditMode(true)}
            accessibilityRole="button"
            accessibilityLabel={t("views.today.customize.entry")}
            hitSlop={8}
            className="rounded-md p-2"
          >
            <Settings2 size={18} color={c.textMuted} />
          </Pressable>
        </View>

        {/* Render de secciones: orden y visibilidad mandados por el hook de
            layout; los nodos ausentes (sin datos) se saltan sin dejar hueco. */}
        {layout.order
          .filter((id) => !layout.hidden.has(id))
          .map((id) => {
            const node = sectionNodes[id];
            if (!node) return null;
            return <Fragment key={id}>{node}</Fragment>;
          })}

        <HiddenSectionsFooter
          count={layout.hidden.size}
          onCustomize={() => layout.setEditMode(true)}
          label={t("views.today.customize.hiddenFooter", {
            count: layout.hidden.size,
          })}
        />
      </ScrollView>

      {!layout.editMode && (
        <FAB
          icon={<Plus size={26} color={c.bg} />}
          label={t("views.today.createMenu.title")}
          onPress={() => setCreateOpen(true)}
        />
      )}

      <BottomSheet
        visible={createOpen && !layout.editMode}
        onClose={() => setCreateOpen(false)}
        title={t("views.today.createMenu.title")}
      >
        <View className="gap-1">
          <CreateOption
            icon={<FolderPlus size={18} color={c.accent} />}
            tint={alpha(c.accent, 0.15)}
            label={t("views.today.createMenu.project")}
            onPress={() => goCreate("/project-form")}
          />
          <CreateOption
            icon={<Target size={18} color={c.accent2} />}
            tint={alpha(c.accent2, 0.15)}
            label={t("views.today.createMenu.task")}
            onPress={() => goCreate("/task-form")}
          />
          <CreateOption
            icon={<Repeat size={18} color={PURPLE_T} />}
            tint={`rgba(${PURPLE},0.15)`}
            label={t("views.today.createMenu.routine")}
            onPress={() => goCreate("/routine-form")}
          />
          <CreateOption
            icon={<Lightbulb size={18} color={AMBER_T} />}
            tint={`rgba(${AMBER},0.15)`}
            label={t("views.today.createMenu.idea")}
            onPress={() => goCreate("/idea-form")}
          />
        </View>
      </BottomSheet>

      {/* Cola de decisión de stalled: solo el primero sin resolver es "current"
          y se muestra un modal a la vez. La `key` por id remonta el modal entre
          proyectos para resetear su estado interno. */}
      <StalledProjectModal
        key={currentStalled?.id ?? "none"}
        visible={
          currentStalled !== null && !stalledPauseOpen && !stalledKillOpen
        }
        project={currentStalled}
        saving={closure.saving}
        onResolve={onStalledChoice}
      />
      <PauseProjectModal
        visible={stalledPauseOpen}
        projectName={currentStalled?.name ?? ""}
        saving={closure.saving}
        onCancel={() => setStalledPauseOpen(false)}
        onConfirm={onStalledPause}
      />
      <KillProjectModal
        visible={stalledKillOpen}
        projectName={currentStalled?.name ?? ""}
        saving={closure.saving}
        onCancel={() => setStalledKillOpen(false)}
        onConfirm={onStalledKill}
      />
    </SafeAreaView>
  );
}
