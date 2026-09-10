import { useState } from "react";
import { headerOptionsFor } from "@/components/ui/HeaderBackButton";
import { Spine, spineStrikesTitle } from "@/components/ui/Spine";
import { CoolingRule } from "@/components/ui/CoolingRule";
import { BlockerBadge } from "@/components/ui/BlockerBadge";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { Meta } from "@/components/ui/Meta";
import {
  projectBlockedDays,
  projectCooling,
  projectDays,
  taskIsBlocked,
} from "@/lib/cooling";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { HeartPulse, Pause, Pencil, Plus, Rocket, Skull, Trash2, Zap } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { Task } from "@/lib/types";
import { priorityFill } from "@/lib/priority";
import { confirmAsync } from "@/lib/confirm";
import { todayLocalISODate } from "@/lib/date";
import { toast } from "@/lib/toast";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { useProjectMutations } from "@/hooks/useProjectMutations";
import { useProjectNoteMutations } from "@/hooks/useProjectNoteMutations";
import { useProjectClosure } from "@/hooks/useProjectClosure";
import { countsTowardCap, usePlan } from "@/hooks/usePlan";
import { TaskRow } from "@/components/tasks/TaskRow";
import { ShowMoreList } from "@/components/ui/ShowMoreList";
import { StatusBadge } from "@/components/projects/StatusBadge";
import { WelcomeBackCard } from "@/components/projects/WelcomeBackCard";
import {
  PauseProjectModal,
  type PauseNotes,
} from "@/components/projects/PauseProjectModal";
import {
  KillProjectModal,
  type KillNotes,
} from "@/components/projects/KillProjectModal";
import { ReviveProjectModal } from "@/components/projects/ReviveProjectModal";
import { useTheme } from "@/theme/ThemeProvider";
import { THEME_SURFACES } from "@/theme/tokens";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center gap-2">
        <Meta variant="cintillo" tone="muted">
          {title}
        </Meta>
        {count != null && count > 0 && (
          <View className="rounded-full border border-border bg-surface px-2 py-0.5">
            <Text className="font-sans text-[10px] tabular-nums text-text-muted">
              {count}
            </Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );
}

function firstLine(s: string): string {
  return s.split("\n", 1)[0]?.trim() ?? "";
}

function restAfterFirstLine(s: string): string {
  return s.split("\n").slice(1).join("\n").trim();
}

export default function ProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const router = useRouter();
  const c = useThemeColors();
  const { effective } = useTheme();
  const s = THEME_SURFACES[effective];

  const { projects, tasks, activities, notesByProject, categoryById, initialLoading } =
    useDashboardData();
  const { toggleTask, deleteTask, saveTask } = useTaskMutations();
  const { deleteProject } = useProjectMutations();
  const { remove: removeNote } = useProjectNoteMutations();
  const closure = useProjectClosure();
  const { cap } = usePlan();

  const activeUsed = projects.filter((p) => countsTowardCap(p.status)).length;

  const [pauseOpen, setPauseOpen] = useState(false);
  const [killOpen, setKillOpen] = useState(false);
  const [reviveOpen, setReviveOpen] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  const project = projects.find((p) => p.id === id);
  const projectTasks = tasks.filter((tk) => tk.projectId === id);
  const pending = projectTasks.filter((tk) => !tk.done);
  // "Atorado" no es un estado del modelo: se deriva de tareas abiertas con
  // blocker. La razón es lo que de verdad desatasca — "bloqueado" no le dice
  // a nadie qué hacer, "esperando el contrato firmado" sí.
  const blockedPending = pending.filter((tk) => taskIsBlocked(tk));
  const blockedOpen = blockedPending.length;
  const firstBlockerReason =
    blockedPending[0]?.blockedReason ||
    blockedPending[0]?.blockers?.[0]?.externalDescription ||
    undefined;
  const completed = projectTasks
    .filter((tk) => tk.done)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  const projectUpdates = activities
    .filter((a) => a.kind === "note" && a.projectId === id)
    .sort((a, b) => (b.created ?? "").localeCompare(a.created ?? ""));
  const notes = notesByProject[id] ?? [];

  const relativeTime = (iso: string): string => {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return t("notes.justNow");
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t("notes.minutesAgo", { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("notes.hoursAgo", { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return t("notes.daysAgo", { count: days });
    return new Date(iso).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const onDeleteNote = async (noteId: string) => {
    if (await confirmAsync(t("notes.deleteConfirm"))) removeNote(noteId);
  };

  const headerOptions = {
    ...headerOptionsFor(s),
    title: project?.name ?? t("views.projects.detail.title"),
  } as const;

  if (initialLoading && !project) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Stack.Screen options={headerOptions} />
        <ActivityIndicator />
      </View>
    );
  }

  if (!project) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <Stack.Screen options={headerOptions} />
        <Text className="font-sans text-base text-center text-text-muted">
          {t("views.projects.empty")}
        </Text>
      </View>
    );
  }

  const cat = project.categoryId ? categoryById[project.categoryId] : undefined;

  // Quick action on overdue rows: rewrite the due date to today.
  const moveTaskToToday = async (task: Task) => {
    const ok = await saveTask({
      id: task.id,
      title: task.title,
      projectId: task.projectId,
      dueDate: todayLocalISODate(),
      done: task.done,
      effortHours: task.effortHours,
    });
    if (ok) toast.success(t("taskRow.movedToast"), 2000);
  };

  const renderTask = (task: Task) => (
    <TaskRow
      task={task}
      project={undefined}
      onToggle={toggleTask}
      onDelete={deleteTask}
      onEdit={(tk) =>
        router.push({ pathname: "/task-form", params: { id: tk.id } })
      }
      onMoveToday={moveTaskToToday}
    />
  );

  const onDelete = async () => {
    const ok = await deleteProject(project.id);
    if (ok) router.back();
  };

  const onPauseConfirm = async (notes: PauseNotes) => {
    const ok = await closure.pause(project, notes);
    if (ok) setPauseOpen(false);
  };
  const onKillConfirm = async (notes: KillNotes) => {
    const ok = await closure.kill(project, notes);
    if (ok) setKillOpen(false);
  };
  const onResume = () => {
    void closure.setStatus(project, "active");
    setWelcomeDismissed(true);
  };
  // The success close: mark the project shipped. No notes modal (mirrors web,
  // where "launched" is just another status in the selector).
  const onLaunch = () => void closure.setStatus(project, "launched");
  const onRevive = async (target: "active" | "idea") => {
    const ok = await closure.setStatus(project, target);
    if (ok) setReviveOpen(false);
  };

  const showWelcomeBack = project.status === "paused" && !welcomeDismissed;

  // Status actions available from the detail screen, gated by current status.
  // Las etiquetas estaban hardcodeadas en inglés (deuda anotada en CLAUDE.md);
  // el rediseño las pasa a i18n de paso, que era cosa de diez minutos.
  const statusActions: {
    key: string;
    label: string;
    icon: React.ReactNode;
    onPress: () => void;
    tint: string;
  }[] = [];
  if (
    project.status === "active" ||
    project.status === "idea" ||
    project.status === "stalled"
  ) {
    statusActions.push({
      key: "launch",
      label: t("views.projectDetail.statusAction.launch"),
      icon: <Rocket size={15} color={c.closed} />,
      onPress: onLaunch,
      tint: c.closed,
    });
  }
  if (
    project.status === "active" ||
    project.status === "idea" ||
    project.status === "stalled" ||
    project.status === "launched"
  ) {
    statusActions.push({
      key: "pause",
      label: t("views.projectDetail.statusAction.pause"),
      icon: <Pause size={15} color={c.textMuted} />,
      onPress: () => setPauseOpen(true),
      tint: c.textMuted,
    });
    statusActions.push({
      key: "kill",
      label: t("views.projectDetail.statusAction.kill"),
      icon: <Skull size={15} color={c.signal} />,
      onPress: () => setKillOpen(true),
      tint: c.signal,
    });
  }
  if (project.status === "paused" || project.status === "stalled") {
    statusActions.unshift({
      key: "resume",
      label: t("views.projectDetail.statusAction.resume"),
      icon: <Zap size={15} color={c.accent} />,
      onPress: onResume,
      tint: c.accent,
    });
  }
  if (project.status === "killed") {
    statusActions.push({
      key: "revive",
      label: t("views.projectDetail.statusAction.revive"),
      icon: <HeartPulse size={15} color={c.accent} />,
      onPress: () => setReviveOpen(true),
      tint: c.accent,
    });
  }

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen
        options={{
          ...headerOptions,
          headerRight: () => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/project-form",
                  params: { id: project.id },
                })
              }
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("common.edit")}
              // Fixed centered box so the icon sits dead-center (incl. inside
              // iOS 26's circular glass bar-button background).
              style={{
                width: 32,
                height: 32,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Pencil size={20} color={s.text} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerClassName="gap-5 p-5">
        {/* Cabecera del rediseño: espina + nombre en display, y debajo la fila
            de metadatos. El nombre estaba SOLO en el header de navegación, que
            lo trunca; aquí es lo primero que se lee. La regla de enfriamiento
            va a la derecha porque "97 días" es la respuesta a la pregunta que
            trae a nadie a esta pantalla dos veces. */}
        <View className="flex-row items-start gap-3">
          <Spine
            status={project.status}
            priority={project.priority}
            blocked={blockedOpen > 0}
            height={56}
          />
          <View className="min-w-0 flex-1 gap-2">
            <Text
              className="font-display text-text"
              style={{
                fontSize: 26,
                lineHeight: 29,
                letterSpacing: -0.9,
                textDecorationLine: spineStrikesTitle(project.status)
                  ? "line-through"
                  : "none",
              }}
            >
              {project.name}
            </Text>
            <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1.5">
              <View className="flex-row items-center gap-1.5">
                <View
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: priorityFill(project.priority, c) }}
                />
                <Meta variant="cintillo" tone="muted">
                  {t(`priority.${project.priority}`)}
                </Meta>
              </View>
              <StatusBadge status={project.status} />
              <CategoryTag name={cat?.name} color={cat?.color} loose={!cat} />
            </View>
          </View>
          <CoolingRule days={projectDays(project)} cooling={projectCooling(project)} />
        </View>

        {blockedOpen > 0 && (
          <BlockerBadge
            since={projectBlockedDays(project)}
            reason={firstBlockerReason}
            blocksCount={blockedOpen}
          />
        )}

        {showWelcomeBack && (
          <WelcomeBackCard
            project={project}
            reactivating={closure.saving}
            onReactivate={onResume}
            onDismiss={() => setWelcomeDismissed(true)}
          />
        )}

        {statusActions.length > 0 && (
          <View className="flex-row flex-wrap gap-2">
            {statusActions.map((a) => (
              <Pressable
                key={a.key}
                onPress={a.onPress}
                disabled={closure.saving}
                accessibilityRole="button"
                className="flex-row items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2"
              >
                {a.icon}
                <Text className="text-sm font-sans-medium" style={{ color: a.tint }}>
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <View
          className="rounded-lg border px-3 py-2.5"
          style={{
            backgroundColor: alpha(c.accent, 0.05),
            borderColor: alpha(c.accent, 0.2),
          }}
        >
          <Meta variant="cintillo" tone="inherit" className="mb-1" style={{ color: c.accent }}>
            {t("views.projects.card.nextStep")}
          </Meta>
          {project.nextStep ? (
            <Text className="font-sans text-sm text-text">→ {project.nextStep}</Text>
          ) : (
            <Text className="font-sans text-sm italic text-text-muted">
              {t("views.projects.card.nextStepEmpty")}
            </Text>
          )}
        </View>

        <Section title={t("views.projects.card.whyMatters")}>
          {project.why ? (
            <Text className="font-sans text-sm text-text-muted">{project.why}</Text>
          ) : (
            <Text className="font-sans text-sm italic text-text-muted">
              {t("views.projects.card.whyEmpty")}
            </Text>
          )}
        </Section>

        <Section title={t("views.projects.card.description")}>
          {project.description ? (
            <Text className="font-sans text-sm text-text-muted">{project.description}</Text>
          ) : (
            <Text className="font-sans text-sm italic text-text-muted">
              {t("views.projects.card.descriptionEmpty")}
            </Text>
          )}
        </Section>

        <Section title={t("views.projects.card.tasks")}>
          {projectTasks.length === 0 ? (
            <Text className="font-sans text-sm italic text-text-muted">
              {t("views.projects.card.noTasks")}
            </Text>
          ) : (
            <View className="gap-2">
              {pending.map((task) => (
                <View key={task.id}>{renderTask(task)}</View>
              ))}
              <ShowMoreList
                items={completed}
                initialCount={5}
                itemKey={(task) => task.id}
                renderItem={(task) => renderTask(task)}
              />
            </View>
          )}
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/task-form",
                params: { projectId: project.id },
              })
            }
            className="mt-1 flex-row items-center gap-1.5 self-start rounded-md border border-border bg-surface px-3 py-1.5"
          >
            <Plus size={14} color={c.textMuted} />
            <Text className="font-sans text-xs text-text-muted">
              {t("modals.task.newTitle")}
            </Text>
          </Pressable>
        </Section>

        <Section
          title={t("views.projects.card.recentActivity")}
          count={projectUpdates.length}
        >
          {projectUpdates.length === 0 ? (
            <Text className="font-sans text-sm italic text-text-muted">
              {t("views.projects.card.noUpdates")}
            </Text>
          ) : (
            <ShowMoreList
              items={projectUpdates}
              initialCount={5}
              itemKey={(a) => a.id}
              renderItem={(a) => (
                <View className="flex-row gap-2 py-0.5">
                  <Text className="font-sans w-24 shrink-0 text-xs text-text-muted">
                    {new Date(a.created).toLocaleDateString(locale, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                  <Text className="font-sans flex-1 text-sm text-text-muted">{a.note}</Text>
                </View>
              )}
            />
          )}
        </Section>

        <Section title={t("views.projects.card.notes")} count={notes.length}>
          {notes.length === 0 ? (
            <Text className="font-sans text-sm italic text-text-muted">
              {t("notes.empty")}
            </Text>
          ) : (
            <View className="gap-2">
              {notes.map((n) => {
                const heading = n.title || firstLine(n.body);
                const preview = n.title ? n.body : restAfterFirstLine(n.body);
                return (
                  <View
                    key={n.id}
                    className="rounded-lg border border-border bg-surface p-3"
                  >
                    <View className="mb-1 flex-row items-start justify-between gap-2">
                      <Text
                        className={
                          "flex-1 text-sm font-sans-medium " +
                          (heading ? "text-text" : "italic text-text-muted")
                        }
                        numberOfLines={1}
                      >
                        {heading || t("notes.untitled")}
                      </Text>
                      <Pressable
                        onPress={() => onDeleteNote(n.id)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={t("common.delete")}
                      >
                        <Trash2 size={13} color={c.textMuted} />
                      </Pressable>
                    </View>
                    {!!preview && (
                      <Text
                        className="font-sans mb-1.5 text-sm text-text-muted"
                        numberOfLines={3}
                      >
                        {preview}
                      </Text>
                    )}
                    <Text className="font-sans text-[10px] uppercase tracking-wider text-text-muted">
                      {relativeTime(n.updatedAt)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </Section>

        <View className="pt-2">
          <Pressable
            onPress={onDelete}
            className="flex-row items-center gap-1.5 self-start rounded-md px-3 py-2"
            style={{ backgroundColor: alpha(c.signal, 0.1) }}
          >
            <Trash2 size={14} color={c.signal} />
            <Text className="font-sans text-xs" style={{ color: c.signal }}>
              {t("common.delete")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <PauseProjectModal
        visible={pauseOpen}
        projectName={project.name}
        saving={closure.saving}
        onCancel={() => setPauseOpen(false)}
        onConfirm={onPauseConfirm}
      />
      <KillProjectModal
        visible={killOpen}
        projectName={project.name}
        saving={closure.saving}
        onCancel={() => setKillOpen(false)}
        onConfirm={onKillConfirm}
      />
      <ReviveProjectModal
        visible={reviveOpen}
        projectName={project.name}
        wouldRestart={project.killedWouldRestart}
        activeUsed={activeUsed}
        activeCap={cap ?? undefined}
        saving={closure.saving}
        onCancel={() => setReviveOpen(false)}
        onRevive={onRevive}
      />
    </View>
  );
}
