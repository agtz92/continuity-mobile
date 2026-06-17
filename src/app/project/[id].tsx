import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { HeartPulse, Pause, Pencil, Plus, Skull, Trash2, Zap } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { Task } from "@/lib/types";
import { priorityStripeClass } from "@/lib/priority";
import { confirmAsync } from "@/lib/confirm";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { useProjectMutations } from "@/hooks/useProjectMutations";
import { useProjectNoteMutations } from "@/hooks/useProjectNoteMutations";
import { useProjectClosure } from "@/hooks/useProjectClosure";
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
import { alpha, categoryChipColors, useThemeColors } from "@/theme/useThemeColors";

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
        <Text className="text-xs uppercase tracking-wider text-text-muted">
          {title}
        </Text>
        {count != null && count > 0 && (
          <View className="rounded-full border border-border bg-surface px-2 py-0.5">
            <Text className="text-[10px] tabular-nums text-text-muted">
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
  const { toggleTask, deleteTask } = useTaskMutations();
  const { deleteProject } = useProjectMutations();
  const { remove: removeNote } = useProjectNoteMutations();
  const closure = useProjectClosure();

  const [pauseOpen, setPauseOpen] = useState(false);
  const [killOpen, setKillOpen] = useState(false);
  const [reviveOpen, setReviveOpen] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  const project = projects.find((p) => p.id === id);
  const projectTasks = tasks.filter((tk) => tk.projectId === id);
  const pending = projectTasks.filter((tk) => !tk.done);
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
    headerShown: true,
    title: project?.name ?? t("views.projects.detail.title"),
    headerStyle: { backgroundColor: s.surface },
    headerTintColor: s.text,
    headerTitleStyle: { color: s.text },
    headerShadowVisible: false,
    // Chevron only — hide the leaked "(dashboard)" back label.
    headerBackButtonDisplayMode: "minimal",
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
        <Text className="text-base text-center text-text-muted">
          {t("views.projects.empty")}
        </Text>
      </View>
    );
  }

  const cat = project.categoryId ? categoryById[project.categoryId] : undefined;
  const catColors = cat ? categoryChipColors(cat.color, c) : null;

  const renderTask = (task: Task) => (
    <TaskRow
      task={task}
      project={undefined}
      onToggle={toggleTask}
      onDelete={deleteTask}
      onEdit={(tk) =>
        router.push({ pathname: "/task-form", params: { id: tk.id } })
      }
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
  const onRevive = async (target: "active" | "idea") => {
    const ok = await closure.setStatus(project, target);
    if (ok) setReviveOpen(false);
  };

  const showWelcomeBack = project.status === "paused" && !welcomeDismissed;

  // Status actions available from the detail screen, gated by current status.
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
    project.status === "stalled" ||
    project.status === "launched"
  ) {
    statusActions.push({
      key: "pause",
      label: "Pause",
      icon: <Pause size={15} color={c.textMuted} />,
      onPress: () => setPauseOpen(true),
      tint: c.textMuted,
    });
    statusActions.push({
      key: "kill",
      label: "Kill",
      icon: <Skull size={15} color="rgb(220,38,38)" />,
      onPress: () => setKillOpen(true),
      tint: "rgb(220,38,38)",
    });
  }
  if (project.status === "paused" || project.status === "stalled") {
    statusActions.unshift({
      key: "resume",
      label: "Reactivate",
      icon: <Zap size={15} color={c.accent} />,
      onPress: onResume,
      tint: c.accent,
    });
  }
  if (project.status === "killed") {
    statusActions.push({
      key: "revive",
      label: "Revive",
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
        <View className="flex-row flex-wrap items-center gap-2">
          <View className={`h-2.5 w-2.5 rounded-full ${priorityStripeClass[project.priority]}`} />
          <Text className="text-base text-text-muted">{t(`priority.${project.priority}`)}</Text>
          <StatusBadge status={project.status} />
          {cat && catColors && (
            <View
              className="rounded-full border px-2.5 py-0.5"
              style={{ backgroundColor: catColors.bg, borderColor: catColors.border }}
            >
              <Text className="text-xs" style={{ color: catColors.text }}>
                {cat.name}
              </Text>
            </View>
          )}
        </View>

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
                <Text className="text-sm font-medium" style={{ color: a.tint }}>
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
          <Text className="mb-1 text-xs uppercase tracking-wider text-accent">
            {t("views.projects.card.nextStep")}
          </Text>
          {project.nextStep ? (
            <Text className="text-sm text-text">→ {project.nextStep}</Text>
          ) : (
            <Text className="text-sm italic text-text-muted">
              {t("views.projects.card.nextStepEmpty")}
            </Text>
          )}
        </View>

        <Section title={t("views.projects.card.whyMatters")}>
          {project.why ? (
            <Text className="text-sm text-text-muted">{project.why}</Text>
          ) : (
            <Text className="text-sm italic text-text-muted">
              {t("views.projects.card.whyEmpty")}
            </Text>
          )}
        </Section>

        <Section title={t("views.projects.card.description")}>
          {project.description ? (
            <Text className="text-sm text-text-muted">{project.description}</Text>
          ) : (
            <Text className="text-sm italic text-text-muted">
              {t("views.projects.card.descriptionEmpty")}
            </Text>
          )}
        </Section>

        <Section title={t("views.projects.card.tasks")}>
          {projectTasks.length === 0 ? (
            <Text className="text-sm italic text-text-muted">
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
            <Text className="text-xs text-text-muted">
              {t("modals.task.newTitle")}
            </Text>
          </Pressable>
        </Section>

        <Section
          title={t("views.projects.card.recentActivity")}
          count={projectUpdates.length}
        >
          {projectUpdates.length === 0 ? (
            <Text className="text-sm italic text-text-muted">
              {t("views.projects.card.noUpdates")}
            </Text>
          ) : (
            <ShowMoreList
              items={projectUpdates}
              initialCount={5}
              itemKey={(a) => a.id}
              renderItem={(a) => (
                <View className="flex-row gap-2 py-0.5">
                  <Text className="w-24 shrink-0 text-xs text-text-muted">
                    {new Date(a.created).toLocaleDateString(locale, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                  <Text className="flex-1 text-sm text-text-muted">{a.note}</Text>
                </View>
              )}
            />
          )}
        </Section>

        <Section title={t("views.projects.card.notes")} count={notes.length}>
          {notes.length === 0 ? (
            <Text className="text-sm italic text-text-muted">
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
                          "flex-1 text-sm font-medium " +
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
                        className="mb-1.5 text-sm text-text-muted"
                        numberOfLines={3}
                      >
                        {preview}
                      </Text>
                    )}
                    <Text className="text-[10px] uppercase tracking-wider text-text-muted">
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
            style={{ backgroundColor: "rgba(239,68,68,0.1)" }}
          >
            <Trash2 size={14} color="rgb(248,113,113)" />
            <Text className="text-xs" style={{ color: "rgb(248,113,113)" }}>
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
        saving={closure.saving}
        onCancel={() => setReviveOpen(false)}
        onRevive={onRevive}
      />
    </View>
  );
}
