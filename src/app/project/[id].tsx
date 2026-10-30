import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NestableScrollContainer } from "react-native-draggable-flatlist";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { projectBlockedDays, taskIsBlocked } from "@/lib/cooling";
import { byManualOrder } from "@/lib/taskOrder";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useProjectMutations } from "@/hooks/useProjectMutations";
import { headerOptionsFor } from "@/components/ui/HeaderBackButton";
import { ProjectHero } from "@/components/projects/ProjectHero";
import { BlockerBanner } from "@/components/projects/BlockerBanner";
import { NextStepCard } from "@/components/projects/NextStepCard";
import { ProjectProse, ProjectSection } from "@/components/projects/ProjectSection";
import { ProjectTasks } from "@/components/projects/ProjectTasks";
import { ProjectActivity } from "@/components/projects/ProjectActivity";
import { ProjectNotes } from "@/components/projects/ProjectNotes";
import { ProjectUpdateSheet } from "@/components/projects/ProjectUpdateSheet";
import { WelcomeBackCard } from "@/components/projects/WelcomeBackCard";
import { useProjectStatusFlow } from "@/components/projects/useProjectStatusFlow";
import { useTheme } from "@/theme/ThemeProvider";
import { SIZE, THEME_SURFACES } from "@/theme/tokens";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

/**
 * Detalle de proyecto (1g). Cabecera nativa con "← Projects" y "Edit"; hero
 * con espina y píldora de estado; banner de bloqueo; next step con
 * Continue here / Update; secciones con cintillo + regla + conteo. Las piezas
 * viven en `components/projects/`.
 */
export default function ProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { effective } = useTheme();
  const s = THEME_SURFACES[effective];

  const { projects, tasks, activities, notesByProject, categoryById, initialLoading } =
    useDashboardData();
  const { deleteProject } = useProjectMutations();

  const [updateOpen, setUpdateOpen] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  const project = projects.find((p) => p.id === id);
  const flow = useProjectStatusFlow(project, projects);

  const { pending, completed, blockedPending } = useMemo(() => {
    const projectTasks = tasks.filter((tk) => tk.projectId === id);
    // Pendientes en orden manual (arrastrables); hechas debajo por fecha de cierre.
    const pend = projectTasks.filter((tk) => !tk.done).sort(byManualOrder);
    return {
      pending: pend,
      completed: projectTasks
        .filter((tk) => tk.done)
        .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
      // "Atorado" no es un estado del modelo: se deriva de tareas abiertas con blocker.
      blockedPending: pend.filter((tk) => taskIsBlocked(tk)),
    };
  }, [tasks, id]);
  const projectUpdates = useMemo(
    () =>
      activities
        .filter((a) => a.kind === "note" && a.projectId === id)
        .sort((a, b) => (b.created ?? "").localeCompare(a.created ?? "")),
    [activities, id]
  );
  const notes = notesByProject[id] ?? [];

  const headerOptions = headerOptionsFor(s, { backLabel: t("tabs.projects"), bare: true });

  if (!project) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <Stack.Screen options={headerOptions} />
        {initialLoading ? (
          <ActivityIndicator />
        ) : (
          <Text className="font-sans text-center" style={{ fontSize: 16, color: c.text3 }}>
            {t("views.projects.empty")}
          </Text>
        )}
      </View>
    );
  }

  const blockedOpen = blockedPending.length;
  // La razón es lo que de verdad desatasca.
  const firstBlockerReason =
    blockedPending[0]?.blockedReason ||
    blockedPending[0]?.blockers?.[0]?.externalDescription ||
    undefined;

  const onDelete = async () => {
    // "Matar" en vez de eliminar abre el mismo ritual que la píldora de estado.
    // Ya muerto, confirm simple. El modal espera a que la alerta termine de
    // cerrarse (iOS no presenta un `<Modal>` sobre una alerta saliente).
    const onKill =
      project.status === "killed" ? undefined : () => setTimeout(flow.openKill, 350);
    const ok = await deleteProject(project.id, { onKill });
    if (ok) router.back();
  };

  const onResume = () => {
    void flow.closure.setStatus(project, "active");
    setWelcomeDismissed(true);
  };

  // "Continue here": el next step se vuelve una tarea para hoy (task-form
  // acepta `title`/`due` como prefill).
  const onContinue = () =>
    router.push({
      pathname: "/task-form",
      params: { projectId: project.id, title: project.nextStep, due: "today" },
    });

  const total = pending.length + completed.length;

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen
        options={{
          ...headerOptions,
          headerRight: () => (
            <Pressable
              onPress={() =>
                router.push({ pathname: "/project-form", params: { id: project.id } })
              }
              accessibilityRole="button"
              accessibilityLabel={t("common.edit")}
              className="items-center justify-center active:opacity-60"
              style={{ height: SIZE.hit, paddingHorizontal: 12 }}
            >
              <Text className="font-sans-semibold" style={{ fontSize: 16, color: c.accent }}>
                {t("common.edit")}
              </Text>
            </Pressable>
          ),
        }}
      />
      <GestureHandlerRootView className="flex-1 bg-bg">
        {/* NestableScrollContainer: deja que la lista de pendientes se arrastre
            (long-press en ⠿) sin pelearse con el scroll. */}
        <NestableScrollContainer
          contentContainerStyle={{ gap: 28, padding: SIZE.gutter, paddingBottom: 48 }}
        >
          <ProjectHero
            project={project}
            category={project.categoryId ? categoryById[project.categoryId] : undefined}
            blocked={blockedOpen > 0}
            onStatusPress={flow.openStatusSheet}
          />

          {blockedOpen > 0 ? (
            <BlockerBanner
              since={projectBlockedDays(project)}
              reason={firstBlockerReason}
              blocksCount={blockedOpen}
            />
          ) : null}

          {project.status === "paused" && !welcomeDismissed ? (
            <WelcomeBackCard
              project={project}
              reactivating={flow.closure.saving}
              onReactivate={onResume}
              onDismiss={() => setWelcomeDismissed(true)}
            />
          ) : null}

          <NextStepCard
            nextStep={project.nextStep}
            onContinue={onContinue}
            onUpdate={() => setUpdateOpen(true)}
          />

          <ProjectSection title={t("views.projects.card.whyMatters")}>
            <ProjectProse text={project.why} empty={t("views.projects.card.whyEmpty")} />
          </ProjectSection>

          <ProjectSection title={t("views.projects.card.description")}>
            <ProjectProse
              text={project.description}
              empty={t("views.projects.card.descriptionEmpty")}
            />
          </ProjectSection>

          <ProjectSection
            title={t("views.projects.card.tasks")}
            meta={
              total > 0
                ? t("views.projectDetail.tasksMeta", {
                    open: pending.length,
                    done: completed.length,
                  })
                : null
            }
          >
            <ProjectTasks project={project} pending={pending} completed={completed} />
          </ProjectSection>

          <ProjectSection
            title={t("views.projects.card.recentActivity")}
            meta={projectUpdates.length > 0 ? String(projectUpdates.length) : null}
          >
            <ProjectActivity updates={projectUpdates} />
          </ProjectSection>

          <ProjectSection
            title={t("views.projects.card.notes")}
            meta={notes.length > 0 ? String(notes.length) : null}
          >
            <ProjectNotes notes={notes} />
          </ProjectSection>

          <Pressable
            onPress={onDelete}
            accessibilityRole="button"
            className="items-center justify-center rounded-md border active:opacity-70"
            style={{
              height: 48,
              borderColor: alpha(c.signal, 0.35),
              backgroundColor: alpha(c.signal, 0.06),
            }}
          >
            <Text className="font-sans-semibold" style={{ fontSize: 15, color: c.signal }}>
              {t("views.projectDetail.deleteProject")}
            </Text>
          </Pressable>
        </NestableScrollContainer>
      </GestureHandlerRootView>

      <ProjectUpdateSheet
        visible={updateOpen}
        projectId={project.id}
        onClose={() => setUpdateOpen(false)}
      />
      {flow.element}
    </View>
  );
}
