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
  ChevronRight,
  Clock,
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
import type { Routine } from "@/lib/types";
import { daysOverdue, daysSince } from "@/lib/date";
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
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { FAB } from "@/components/ui/FAB";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ProjectCardCompact } from "@/components/projects/ProjectCardCompact";
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
import { RoutineRow } from "@/components/routines/RoutineRow";
import { consumeCustomizeRequest, subscribeCustomize } from "@/lib/tour";
import { TodaySectionEditRow } from "@/components/today/TodaySectionEditRow";
import { TodayCustomizeBar } from "@/components/today/TodayCustomizeBar";
import { HiddenSectionsFooter } from "@/components/today/HiddenSectionsFooter";
import { TodayFocusSection } from "@/components/today/TodayFocusSection";
import { DoneTodaySection } from "@/components/today/DoneTodaySection";
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

/** Fixed-palette tint for the sleeping-project dot, keyed by idle bucket. */
const sleepingDot: Record<"7-14" | "15-30" | "30+", string> = {
  "7-14": AMBER_T,
  "15-30": ORANGE_T,
  "30+": RED_T,
};

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
  const [showRoutinesToday, setShowRoutinesToday] = useState(true);
  const [showCloseable, setShowCloseable] = useState(false);
  const [showSleeping, setShowSleeping] = useState(false);
  const [showActive, setShowActive] = useState(false);
  const [showLaunched, setShowLaunched] = useState(false);
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

  const resolveRoutineProject = (r: Routine) => {
    if (!r.projectId) return undefined;
    const proj = projects.find((p) => p.id === r.projectId);
    if (!proj) return undefined;
    const cat = proj.categoryId ? categoryById[proj.categoryId] : undefined;
    return { name: proj.name, color: cat?.color ?? "emerald" };
  };

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
    sectionNodes.counters = (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 pr-3"
      >
        {counters.map((co) => (
          <View
            key={co.id}
            className="min-w-[120px] rounded-xl border border-border bg-surface px-4 py-3"
          >
            <Text className="text-[11px] uppercase tracking-wider text-text-muted">
              {co.label}
            </Text>
            <Text className="mt-0.5 text-2xl font-bold" style={{ color: co.tint }}>
              {co.value}
            </Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  // Sección: stalled-alert — banner ámbar con los proyectos detenidos; cada chip
  // navega al proyecto. Es distinta de la cola de modales de decisión (más abajo).
  if (stalled.length > 0) {
    sectionNodes["stalled-alert"] = (
      <View
        className="rounded-xl border p-4"
        style={{
          backgroundColor: `rgba(${AMBER},0.1)`,
          borderColor: `rgba(${AMBER},0.3)`,
        }}
      >
        <View className="flex-row items-start gap-3">
          <Bell size={18} color={AMBER_T} />
          <View className="flex-1">
            <Text className="mb-1 font-semibold" style={{ color: AMBER_T }}>
              {t("views.today.stalledAlert.title", { count: stalled.length })}
            </Text>
            <Text className="text-sm" style={{ color: `rgba(${AMBER},0.9)` }}>
              {t("views.today.stalledAlert.subtitleLead")}{" "}
              <Text className="font-bold">
                {t("views.today.stalledAlert.subtitleEmphasis")}
              </Text>
            </Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {stalled.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => jumpToProject(p.id)}
                  className="rounded-md px-3 py-1.5"
                  style={{ backgroundColor: `rgba(${AMBER},0.2)` }}
                >
                  <Text className="text-xs" style={{ color: AMBER_T }}>
                    {p.name} · {daysSince(p.lastActivity)}d
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </View>
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
      <CollapsibleSection
        open={showRoutinesToday}
        onToggle={() => setShowRoutinesToday((s) => !s)}
        icon={<Repeat size={18} color={c.accent2} />}
        title={t("views.today.routines.title")}
        rightSlot={
          todayRoutineCounts.total > 0 ? (
            <View className="flex-row flex-wrap items-center gap-2">
              <View
                className="flex-row items-center gap-1.5 rounded-full border px-2.5 py-1"
                style={{
                  backgroundColor: `rgba(${ORANGE},0.2)`,
                  borderColor: `rgba(${ORANGE},0.4)`,
                }}
              >
                <Repeat size={11} color={ORANGE_T} />
                <Text className="text-xs font-medium" style={{ color: ORANGE_T }}>
                  {t("views.today.routines.routinesLabel", {
                    count: todayRoutineCounts.total,
                  })}
                </Text>
                {todayRoutineCounts.overdue > 0 && (
                  <Text className="text-xs font-semibold" style={{ color: RED_T }}>
                    {t("views.today.routines.overdueExtra", {
                      count: todayRoutineCounts.overdue,
                    })}
                  </Text>
                )}
              </View>
              {todayRoutineEffortHours > 0 && (
                <View
                  className="flex-row items-center gap-1 rounded-full border px-2.5 py-1"
                  style={{
                    backgroundColor: alpha(c.accent2, 0.15),
                    borderColor: alpha(c.accent2, 0.4),
                  }}
                >
                  <Clock size={11} color={c.accent2} />
                  <Text className="text-xs font-medium text-accent-2">
                    {t("views.today.routines.totalHoursLabel", {
                      hours: todayRoutineEffortHours,
                    })}
                  </Text>
                </View>
              )}
            </View>
          ) : null
        }
      >
        <View className="gap-3">
          {todayRoutineItems.map((it) => (
            <RoutineRow
              key={`${it.routine.id}-${it.scheduledDate}`}
              routine={it.routine}
              scheduledDate={it.scheduledDate}
              occurrenceId={null}
              project={resolveRoutineProject(it.routine)}
              onComplete={completeOccurrence}
              onUncomplete={uncompleteOccurrence}
            />
          ))}
        </View>
      </CollapsibleSection>
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
      <CollapsibleSection
        open={showCloseable}
        onToggle={() => setShowCloseable((s) => !s)}
        icon={<Flag size={18} color={c.accent} />}
        title={t("views.today.closeable.title")}
        rightSlot={
          <View
            className="rounded-full border px-2 py-0.5"
            style={{
              backgroundColor: alpha(c.accent, 0.1),
              borderColor: alpha(c.accent, 0.3),
            }}
          >
            <Text className="text-xs text-accent">{closableTotal}</Text>
          </View>
        }
      >
        <View className="gap-3">
          {closableProjects.almostThere.map((sp) => {
            const pct = Math.round(sp.donePct * 100);
            return (
              <Pressable
                key={`almost-${sp.project.id}`}
                onPress={() => jumpToProject(sp.project.id)}
                className="rounded-xl border p-4"
                style={{
                  backgroundColor: alpha(c.accent, 0.05),
                  borderColor: alpha(c.accent, 0.3),
                }}
              >
                <Text className="mb-2 text-xs font-medium uppercase tracking-wider text-accent">
                  {t("views.today.closeable.almostThereChip", { pct })}
                </Text>
                <Text className="text-base mb-2 font-semibold text-text">
                  {sp.project.name}
                </Text>
                <View className="mb-2 h-1.5 overflow-hidden rounded-full bg-border">
                  <View
                    className="h-full"
                    style={{ width: `${pct}%`, backgroundColor: c.accent }}
                  />
                </View>
                <Text className="text-xs text-text-muted">
                  {t("views.today.closeable.tasksLeft", {
                    count: sp.openCount,
                    done: sp.doneCount,
                    total: sp.totalCount,
                  })}
                </Text>
              </Pressable>
            );
          })}
          {closableProjects.quickWins.map((sp) => (
            <Pressable
              key={`quick-${sp.project.id}`}
              onPress={() => jumpToProject(sp.project.id)}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <Text className="mb-2 text-xs font-medium uppercase tracking-wider text-accent">
                {t("views.today.closeable.quickWin")}
              </Text>
              <Text className="text-base mb-2 font-semibold text-text">
                {sp.project.name}
              </Text>
              <Text className="text-xs text-text-muted">
                {t("views.today.closeable.tasksAway", { count: sp.openCount })}
              </Text>
            </Pressable>
          ))}
        </View>
      </CollapsibleSection>
    );
  }

  // Sección: sleeping — proyectos "dormidos" (inactivos N días), con punto de
  // color según el bucket de inactividad (7-14 / 15-30 / 30+). Acción: reanudar.
  if (stalledProjects.length > 0) {
    sectionNodes.sleeping = (
      <CollapsibleSection
        open={showSleeping}
        onToggle={() => setShowSleeping((s) => !s)}
        icon={<Moon size={18} color={AMBER_T} />}
        title={t("views.today.sleeping.title")}
        rightSlot={
          <View
            className="rounded-full border px-2 py-0.5"
            style={{
              backgroundColor: `rgba(${AMBER},0.1)`,
              borderColor: `rgba(${AMBER},0.3)`,
            }}
          >
            <Text className="text-xs" style={{ color: AMBER_T }}>
              {stalledProjects.length}
            </Text>
          </View>
        }
      >
        <View className="gap-2">
          {stalledProjects.map(({ project, days, bucket }) => (
            <View
              key={project.id}
              className="flex-row items-center gap-3 rounded-xl border border-border bg-surface p-3"
            >
              <View
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: sleepingDot[bucket] }}
              />
              <View className="min-w-0 flex-1">
                <View className="flex-row flex-wrap items-center gap-2">
                  <Pressable onPress={() => jumpToProject(project.id)}>
                    <Text className="text-base font-semibold text-text">
                      {project.name}
                    </Text>
                  </Pressable>
                  <View
                    className="rounded border px-2 py-0.5"
                    style={{
                      backgroundColor: `rgba(${AMBER},0.15)`,
                      borderColor: `rgba(${AMBER},0.3)`,
                    }}
                  >
                    <Text className="text-xs" style={{ color: AMBER_T }}>
                      {t("views.today.sleeping.daysIdle", { count: days })}
                    </Text>
                  </View>
                </View>
                {project.nextStep && (
                  <Text
                    className="mt-0.5 text-xs text-text-muted"
                    numberOfLines={1}
                  >
                    → {project.nextStep}
                  </Text>
                )}
              </View>
              <Pressable
                onPress={() => jumpToProject(project.id)}
                className="rounded-md border px-3 py-1.5"
                style={{
                  backgroundColor: alpha(c.accent, 0.15),
                  borderColor: alpha(c.accent, 0.4),
                }}
              >
                <Text className="text-xs text-accent">
                  {t("views.today.sleeping.resume")}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      </CollapsibleSection>
    );
  }

  // Sección: stale-ideas — banner morado que invita a revisar ideas viejas;
  // tap lleva a la bandeja de ideas.
  if (staleIdeas.length > 0) {
    sectionNodes["stale-ideas"] = (
      <Pressable
        onPress={() => router.push("/ideas")}
        className="rounded-xl border p-4"
        style={{
          backgroundColor: `rgba(${PURPLE},0.05)`,
          borderColor: `rgba(${PURPLE},0.3)`,
        }}
      >
        <View className="flex-row items-start gap-3">
          <Lightbulb size={18} color={PURPLE_T} />
          <View className="flex-1">
            <Text className="mb-1 font-semibold" style={{ color: PURPLE_T }}>
              {t("views.today.staleIdeas.title", { count: staleIdeas.length })}
            </Text>
            <Text className="text-sm" style={{ color: `rgba(${PURPLE},0.8)` }}>
              {t("views.today.staleIdeas.subtitle")}
            </Text>
          </View>
          <ChevronRight size={18} color={PURPLE_T} />
        </View>
      </Pressable>
    );
  }

  // Sección: active-projects — proyectos en curso como tarjetas compactas con
  // stats de esfuerzo y resaltado de "comeback" (regreso tras una pausa).
  if (activeProjects.length > 0) {
    sectionNodes["active-projects"] = (
      <CollapsibleSection
        open={showActive}
        onToggle={() => setShowActive((s) => !s)}
        icon={<Zap size={18} color={c.accent} />}
        title={t("views.today.active.title")}
        rightSlot={
          <View
            className="rounded-full border px-2 py-0.5"
            style={{
              backgroundColor: alpha(c.accent, 0.1),
              borderColor: alpha(c.accent, 0.3),
            }}
          >
            <Text className="text-xs text-accent">{activeProjects.length}</Text>
          </View>
        }
      >
        <View className="gap-3">
          {activeProjects.map((p) => {
            const stats = projectProgressById.get(p.id);
            return (
              <ProjectCardCompact
                key={p.id}
                project={p}
                projectTasks={tasks.filter((tt) => tt.projectId === p.id)}
                variant="active"
                categoryById={categoryById}
                totalEffortHours={stats?.totalEffortHours}
                todayEffortHours={stats?.todayEffortHours}
                comebackGapDays={
                  comebackProjectIds.has(p.id)
                    ? comebackGapByProject.get(p.id) ?? null
                    : null
                }
                onPress={() => jumpToProject(p.id)}
              />
            );
          })}
        </View>
      </CollapsibleSection>
    );
  }

  // Sección: launched-with-tasks — proyectos ya lanzados que aún tienen tareas
  // abiertas (mantenimiento post-lanzamiento), como tarjetas compactas.
  if (launchedWithOpenTasks.length > 0) {
    sectionNodes["launched-with-tasks"] = (
      <CollapsibleSection
        open={showLaunched}
        onToggle={() => setShowLaunched((s) => !s)}
        icon={<Rocket size={18} color={c.accent2} />}
        title={t("views.today.launched.title")}
        rightSlot={
          <View
            className="rounded-full border px-2 py-0.5"
            style={{
              backgroundColor: alpha(c.accent2, 0.1),
              borderColor: alpha(c.accent2, 0.3),
            }}
          >
            <Text className="text-xs text-accent-2">
              {launchedWithOpenTasks.length}
            </Text>
          </View>
        }
      >
        <View className="gap-3">
          {launchedWithOpenTasks.map(({ project: p, projectTasks }) => {
            const stats = projectProgressById.get(p.id);
            return (
              <ProjectCardCompact
                key={p.id}
                project={p}
                projectTasks={projectTasks}
                variant="launched"
                categoryById={categoryById}
                totalEffortHours={stats?.totalEffortHours}
                todayEffortHours={stats?.todayEffortHours}
                comebackGapDays={
                  comebackProjectIds.has(p.id)
                    ? comebackGapByProject.get(p.id) ?? null
                    : null
                }
                onPress={() => jumpToProject(p.id)}
              />
            );
          })}
        </View>
      </CollapsibleSection>
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
