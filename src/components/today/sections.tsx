/**
 * Secciones "chicas" de la pantalla Hoy. El estado de plegado vive en cada
 * componente; datos/callbacks por props.
 *
 * Rediseño Breathe: cabecera con `CollapsibleSection` (conteos en segunda
 * línea, nunca píldoras en la línea del título) y filas rayadas en vez de
 * tarjeta por ítem.
 */

import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  Bell,
  ChevronRight,
  Flag,
  Lightbulb,
  Moon,
  Repeat,
  Rocket,
  Zap,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import type { Category, Project, Routine, Task } from "@/lib/types";
import { daysSince } from "@/lib/date";
import { alpha, useThemeColors } from "@/theme/useThemeColors";
import { SIZE } from "@/theme/tokens";
import { Figure } from "@/components/ui/Figure";
import { Meta } from "@/components/ui/Meta";
import { RuledRow } from "@/components/ui/RuledRow";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { ProjectCardCompact } from "@/components/projects/ProjectCardCompact";
import { RoutineRow } from "@/components/routines/RoutineRow";
import type { useTodayFocus } from "@/hooks/useTodayFocus";
import type { useProductivityStats } from "@/hooks/useProductivityStats";
import type { TodayRoutineItem } from "./todayRoutines";
import { sleepingDot } from "./todayColors";

type FocusModel = ReturnType<typeof useTodayFocus>;
type Stats = ReturnType<typeof useProductivityStats>;

/** Ícono de cabecera de sección: 18 px en `text3`, o en el tono que la sección pida. */
const ICON = 18;

export function CountersSection({
  counters,
}: {
  counters: { id: string; label: string; value: number; tint: string }[];
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 pr-3"
    >
      {counters.map((co) => (
        // Regla arriba en vez de tarjeta: la cifra es lo que se lee.
        <View key={co.id} className="min-w-[104px] gap-1.5 pr-4">
          <View style={{ height: 3, width: 28, backgroundColor: co.tint }} />
          <Figure size={30} tone={co.tint}>
            {co.value}
          </Figure>
          <Meta variant="cintillo" tone="muted">
            {co.label}
          </Meta>
        </View>
      ))}
    </ScrollView>
  );
}

export function StalledAlertSection({
  stalled,
  jumpToProject,
}: {
  stalled: FocusModel["stalled"];
  jumpToProject: (id: string) => void;
}) {
  const c = useThemeColors();
  const { t } = useTranslation();
  return (
    <View
      className="rounded-lg"
      style={{
        padding: 16,
        borderLeftWidth: 3,
        borderLeftColor: c.accent,
        backgroundColor: alpha(c.accent, 0.08),
      }}
    >
      <View className="flex-row items-start gap-3">
        <Bell size={ICON} color={c.accent} />
        <View className="flex-1">
          <Text className="mb-1 font-sans-semibold" style={{ fontSize: 16, color: c.text }}>
            {t("views.today.stalledAlert.title", { count: stalled.length })}
          </Text>
          <Text className="font-sans" style={{ fontSize: 15, color: c.text2 }}>
            {t("views.today.stalledAlert.subtitleLead")}{" "}
            <Text className="font-sans-bold">{t("views.today.stalledAlert.subtitleEmphasis")}</Text>
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {stalled.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => jumpToProject(p.id)}
                accessibilityRole="button"
                className="justify-center rounded-md px-3 active:opacity-70"
                style={{ minHeight: 36, backgroundColor: alpha(c.accent, 0.16) }}
              >
                <Text className="font-sans-medium" style={{ fontSize: 14, color: c.accent }}>
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

export function RoutinesTodaySection({
  todayRoutineItems,
  todayRoutineCounts,
  todayRoutineEffortHours,
  projects,
  categoryById,
  completeOccurrence,
  uncompleteOccurrence,
}: {
  todayRoutineItems: TodayRoutineItem[];
  todayRoutineCounts: { total: number; dueToday: number; overdue: number };
  todayRoutineEffortHours: number;
  projects: Project[];
  categoryById: Record<string, Category>;
  completeOccurrence: (routineId: string, scheduledDate: string) => void | Promise<void>;
  uncompleteOccurrence: (occurrenceId: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(true);
  const { t } = useTranslation();
  const c = useThemeColors();
  const resolveRoutineProject = (r: Routine) => {
    if (!r.projectId) return undefined;
    const proj = projects.find((p) => p.id === r.projectId);
    if (!proj) return undefined;
    const cat = proj.categoryId ? categoryById[proj.categoryId] : undefined;
    return { name: proj.name, color: cat?.color ?? "emerald" };
  };
  const meta =
    todayRoutineCounts.total > 0 ? (
      <>
        {t("views.today.routines.routinesLabel", { count: todayRoutineCounts.total })}
        {todayRoutineCounts.overdue > 0 ? (
          <Text style={{ color: c.signal }}>
            {" "}
            {t("views.today.routines.overdueExtra", { count: todayRoutineCounts.overdue })}
          </Text>
        ) : null}
        {todayRoutineEffortHours > 0
          ? ` · ${t("views.today.routines.totalHoursLabel", { hours: todayRoutineEffortHours })}`
          : ""}
      </>
    ) : null;
  return (
    <CollapsibleSection
      open={open}
      onToggle={() => setOpen((s) => !s)}
      icon={<Repeat size={ICON} color={c.text3} />}
      title={t("views.today.routines.title")}
      meta={meta}
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

/** Fila rayada de proyecto con espina, cintillo arriba y meta abajo. */
function ProjectLine({
  kicker,
  name,
  meta,
  spine,
  onPress,
  last,
  progressPct,
}: {
  kicker?: string;
  name: string;
  meta?: string | null;
  spine: string;
  onPress: () => void;
  last: boolean;
  progressPct?: number;
}) {
  const c = useThemeColors();
  return (
    <RuledRow
      spine={spine}
      onPress={onPress}
      last={last}
      accessibilityLabel={name}
      trailing={<ChevronRight size={18} color={c.text5} style={{ marginTop: 2 }} />}
    >
      {kicker ? (
        <Meta variant="cintillo" tone="inherit" style={{ color: spine, marginBottom: 4 }}>
          {kicker}
        </Meta>
      ) : null}
      <Text className="font-sans-semibold" style={{ fontSize: 17, color: c.text }}>
        {name}
      </Text>
      {progressPct != null ? (
        <View
          className="mt-2 overflow-hidden rounded-full"
          style={{ height: 4, backgroundColor: c.line[14] }}
        >
          <View style={{ height: 4, width: `${progressPct}%`, backgroundColor: spine }} />
        </View>
      ) : null}
      {meta ? (
        <Text className="mt-1 font-sans" style={{ fontSize: 14, color: c.text3 }}>
          {meta}
        </Text>
      ) : null}
    </RuledRow>
  );
}

export function CloseableSection({
  closableProjects,
  jumpToProject,
}: {
  closableProjects: Stats["closableProjects"];
  jumpToProject: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const c = useThemeColors();
  const total = closableProjects.quickWins.length + closableProjects.almostThere.length;
  const rows = [
    ...closableProjects.almostThere.map((sp) => ({ kind: "almost" as const, sp })),
    ...closableProjects.quickWins.map((sp) => ({ kind: "quick" as const, sp })),
  ];
  return (
    <CollapsibleSection
      open={open}
      onToggle={() => setOpen((s) => !s)}
      icon={<Flag size={ICON} color={c.accent} />}
      title={t("views.today.closeable.title")}
      meta={t("views.today.sectionCount", { count: total })}
    >
      <View>
        {rows.map(({ kind, sp }, i) => {
          const pct = Math.round(sp.donePct * 100);
          return (
            <ProjectLine
              key={`${kind}-${sp.project.id}`}
              kicker={
                kind === "almost"
                  ? t("views.today.closeable.almostThereChip", { pct })
                  : t("views.today.closeable.quickWin")
              }
              name={sp.project.name}
              spine={c.accent}
              progressPct={kind === "almost" ? pct : undefined}
              meta={
                kind === "almost"
                  ? t("views.today.closeable.tasksLeft", {
                      count: sp.openCount,
                      done: sp.doneCount,
                      total: sp.totalCount,
                    })
                  : t("views.today.closeable.tasksAway", { count: sp.openCount })
              }
              onPress={() => jumpToProject(sp.project.id)}
              last={i === rows.length - 1}
            />
          );
        })}
      </View>
    </CollapsibleSection>
  );
}

export function SleepingSection({
  stalledProjects,
  jumpToProject,
}: {
  stalledProjects: Stats["stalledProjects"];
  jumpToProject: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const c = useThemeColors();
  return (
    <CollapsibleSection
      open={open}
      onToggle={() => setOpen((s) => !s)}
      icon={<Moon size={ICON} color={c.text3} />}
      title={t("views.today.sleeping.title")}
      meta={t("views.today.sectionCount", { count: stalledProjects.length })}
    >
      <View>
        {stalledProjects.map(({ project, days, bucket }, i) => (
          <RuledRow
            key={project.id}
            spine={sleepingDot(bucket, c)}
            onPress={() => jumpToProject(project.id)}
            last={i === stalledProjects.length - 1}
            accessibilityLabel={project.name}
            trailing={
              <View
                className="items-center justify-center rounded-md px-3"
                style={{ height: 36, borderWidth: 1, borderColor: c.line[18] }}
              >
                <Text className="font-sans-medium" style={{ fontSize: 14, color: c.accent }}>
                  {t("views.today.sleeping.resume")}
                </Text>
              </View>
            }
          >
            <Text className="font-sans-semibold" style={{ fontSize: 17, color: c.text }}>
              {project.name}
            </Text>
            <Text className="mt-1 font-sans" style={{ fontSize: 14, color: c.text3 }}>
              {t("views.today.sleeping.daysIdle", { count: days })}
            </Text>
            {project.nextStep ? (
              <Text
                className="mt-0.5 font-sans"
                style={{ fontSize: 14, color: c.text3 }}
                numberOfLines={2}
              >
                → {project.nextStep}
              </Text>
            ) : null}
          </RuledRow>
        ))}
      </View>
    </CollapsibleSection>
  );
}

export function StaleIdeasSection({ staleIdeas }: { staleIdeas: Stats["staleIdeas"] }) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push("/ideas")}
      accessibilityRole="button"
      className="flex-row items-center gap-3 rounded-lg active:opacity-70"
      style={{
        minHeight: SIZE.row,
        padding: 14,
        borderWidth: 1,
        borderColor: c.line[14],
        backgroundColor: c.surface,
      }}
    >
      <Lightbulb size={ICON} color={c.text3} />
      <View className="flex-1">
        <Text className="font-sans-semibold" style={{ fontSize: 16, color: c.text }}>
          {t("views.today.staleIdeas.title", { count: staleIdeas.length })}
        </Text>
        <Text className="mt-0.5 font-sans" style={{ fontSize: 14, color: c.text3 }}>
          {t("views.today.staleIdeas.subtitle")}
        </Text>
      </View>
      <ChevronRight size={18} color={c.text3} />
    </Pressable>
  );
}

type ProjectListProps = {
  categoryById: Record<string, Category>;
  projectProgressById: Stats["projectProgressById"];
  comebackProjectIds: Stats["comebackProjectIds"];
  comebackGapByProject: Stats["comebackGapByProject"];
  jumpToProject: (id: string) => void;
};

function ProjectCards({
  items,
  variant,
  categoryById,
  projectProgressById,
  comebackProjectIds,
  comebackGapByProject,
  jumpToProject,
}: ProjectListProps & {
  items: { project: Project; projectTasks: Task[] }[];
  variant: "active" | "launched";
}) {
  return (
    <View className="gap-3">
      {items.map(({ project: p, projectTasks }) => {
        const stats = projectProgressById.get(p.id);
        return (
          <ProjectCardCompact
            key={p.id}
            project={p}
            projectTasks={projectTasks}
            variant={variant}
            categoryById={categoryById}
            totalEffortHours={stats?.totalEffortHours}
            todayEffortHours={stats?.todayEffortHours}
            comebackGapDays={
              comebackProjectIds.has(p.id) ? comebackGapByProject.get(p.id) ?? null : null
            }
            onPress={() => jumpToProject(p.id)}
          />
        );
      })}
    </View>
  );
}

export function ActiveProjectsSection({
  activeProjects,
  tasks,
  ...rest
}: ProjectListProps & { activeProjects: Project[]; tasks: Task[] }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const c = useThemeColors();
  return (
    <CollapsibleSection
      open={open}
      onToggle={() => setOpen((s) => !s)}
      icon={<Zap size={ICON} color={c.accent} />}
      title={t("views.today.active.title")}
      meta={t("views.today.sectionCount", { count: activeProjects.length })}
    >
      <ProjectCards
        {...rest}
        variant="active"
        items={activeProjects.map((p) => ({
          project: p,
          projectTasks: tasks.filter((tt) => tt.projectId === p.id),
        }))}
      />
    </CollapsibleSection>
  );
}

export function LaunchedWithTasksSection({
  launchedWithOpenTasks,
  ...rest
}: ProjectListProps & { launchedWithOpenTasks: FocusModel["launchedWithOpenTasks"] }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const c = useThemeColors();
  return (
    <CollapsibleSection
      open={open}
      onToggle={() => setOpen((s) => !s)}
      icon={<Rocket size={ICON} color={c.closed} />}
      title={t("views.today.launched.title")}
      meta={t("views.today.sectionCount", { count: launchedWithOpenTasks.length })}
    >
      <ProjectCards {...rest} variant="launched" items={launchedWithOpenTasks} />
    </CollapsibleSection>
  );
}
