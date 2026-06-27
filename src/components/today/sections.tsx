"use client";

/**
 * Secciones "chicas" de la pantalla Hoy (mobile), extraídas de today.tsx
 * (ver AUDITORIA_CODIGO.md / docs/refactor-modularidad.md). JSX verbatim; el
 * estado de plegado vive en cada componente; datos/callbacks por props.
 */

import { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import {
  Bell,
  ChevronRight,
  Clock,
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
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { ProjectCardCompact } from "@/components/projects/ProjectCardCompact";
import { RoutineRow } from "@/components/routines/RoutineRow";
import type { useTodayFocus } from "@/hooks/useTodayFocus";
import type { useProductivityStats } from "@/hooks/useProductivityStats";
import type { TodayRoutineItem } from "./todayRoutines";
import {
  RED_T,
  ORANGE,
  ORANGE_T,
  AMBER,
  AMBER_T,
  PURPLE,
  PURPLE_T,
  sleepingDot,
} from "./todayColors";

type FocusModel = ReturnType<typeof useTodayFocus>;
type Stats = ReturnType<typeof useProductivityStats>;



interface CountersSectionProps {
  counters: { id: string; label: string; value: number; tint: string }[];
}

export function CountersSection({
  counters,
}: CountersSectionProps) {
  return (
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


interface StalledAlertSectionProps {
  stalled: FocusModel["stalled"];
  jumpToProject: (id: string) => void;
}

export function StalledAlertSection({
  stalled, jumpToProject,
}: StalledAlertSectionProps) {
  const { t } = useTranslation();
  return (
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


interface RoutinesTodaySectionProps {
  todayRoutineItems: TodayRoutineItem[];
  todayRoutineCounts: { total: number; dueToday: number; overdue: number };
  todayRoutineEffortHours: number;
  projects: Project[];
  categoryById: Record<string, Category>;
  completeOccurrence: (routineId: string, scheduledDate: string) => void | Promise<void>;
  uncompleteOccurrence: (occurrenceId: string) => void | Promise<void>;
}

export function RoutinesTodaySection({
  todayRoutineItems, todayRoutineCounts, todayRoutineEffortHours, projects, categoryById, completeOccurrence, uncompleteOccurrence,
}: RoutinesTodaySectionProps) {
  const [showRoutinesToday, setShowRoutinesToday] = useState(true);
  const { t } = useTranslation();
  const c = useThemeColors();
  const resolveRoutineProject = (r: Routine) => {
    if (!r.projectId) return undefined;
    const proj = projects.find((p) => p.id === r.projectId);
    if (!proj) return undefined;
    const cat = proj.categoryId ? categoryById[proj.categoryId] : undefined;
    return { name: proj.name, color: cat?.color ?? "emerald" };
  };
  return (
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


interface CloseableSectionProps {
  closableProjects: Stats["closableProjects"];
  jumpToProject: (id: string) => void;
}

export function CloseableSection({
  closableProjects, jumpToProject,
}: CloseableSectionProps) {
  const [showCloseable, setShowCloseable] = useState(false);
  const { t } = useTranslation();
  const c = useThemeColors();
  const closableTotal =
    closableProjects.quickWins.length + closableProjects.almostThere.length;
  return (
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


interface SleepingSectionProps {
  stalledProjects: Stats["stalledProjects"];
  jumpToProject: (id: string) => void;
}

export function SleepingSection({
  stalledProjects, jumpToProject,
}: SleepingSectionProps) {
  const [showSleeping, setShowSleeping] = useState(false);
  const { t } = useTranslation();
  const c = useThemeColors();
  return (
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


interface StaleIdeasSectionProps {
  staleIdeas: Stats["staleIdeas"];
}

export function StaleIdeasSection({
  staleIdeas,
}: StaleIdeasSectionProps) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
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


interface ActiveProjectsSectionProps {
  activeProjects: Project[];
  tasks: Task[];
  categoryById: Record<string, Category>;
  projectProgressById: Stats["projectProgressById"];
  comebackProjectIds: Stats["comebackProjectIds"];
  comebackGapByProject: Stats["comebackGapByProject"];
  jumpToProject: (id: string) => void;
}

export function ActiveProjectsSection({
  activeProjects, tasks, categoryById, projectProgressById, comebackProjectIds, comebackGapByProject, jumpToProject,
}: ActiveProjectsSectionProps) {
  const [showActive, setShowActive] = useState(false);
  const { t } = useTranslation();
  const c = useThemeColors();
  return (
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


interface LaunchedWithTasksSectionProps {
  launchedWithOpenTasks: FocusModel["launchedWithOpenTasks"];
  categoryById: Record<string, Category>;
  projectProgressById: Stats["projectProgressById"];
  comebackProjectIds: Stats["comebackProjectIds"];
  comebackGapByProject: Stats["comebackGapByProject"];
  jumpToProject: (id: string) => void;
}

export function LaunchedWithTasksSection({
  launchedWithOpenTasks, categoryById, projectProgressById, comebackProjectIds, comebackGapByProject, jumpToProject,
}: LaunchedWithTasksSectionProps) {
  const [showLaunched, setShowLaunched] = useState(false);
  const { t } = useTranslation();
  const c = useThemeColors();
  return (
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
