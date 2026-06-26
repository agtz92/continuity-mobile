import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { CheckCircle2, Clock, Sparkles, TrendingUp, Undo2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { Project, Task } from "@/lib/types";
import { alpha, useThemeColors } from "@/theme/useThemeColors";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import type { useTodayFocus } from "@/hooks/useTodayFocus";
import type { useProductivityStats } from "@/hooks/useProductivityStats";
import { EffortBadge } from "./EffortBadge";

type FocusModel = ReturnType<typeof useTodayFocus>;
type Stats = ReturnType<typeof useProductivityStats>;

interface DoneTodaySectionProps {
  doneTodayItems: FocusModel["doneTodayItems"];
  doneTodayEffortHours: number;
  todayHoursByProject: Stats["todayHoursByProject"];
  projects: Project[];
  jumpToProject: (id: string) => void;
  toggleTask: (t: Task) => void | Promise<void>;
  uncompleteOccurrence: (occurrenceId: string) => void | Promise<void>;
}

/**
 * "Hecho hoy" (mobile): tareas, rutinas y logs completados, con filtro
 * tareas/logs. Extraída de today.tsx (ver AUDITORIA_CODIGO.md); JSX verbatim,
 * estado de plegado/filtro local, datos/callbacks por props.
 */
export function DoneTodaySection({
  doneTodayItems,
  doneTodayEffortHours,
  todayHoursByProject,
  projects,
  jumpToProject,
  toggleTask,
  uncompleteOccurrence,
}: DoneTodaySectionProps) {
  const [showDoneToday, setShowDoneToday] = useState(false);
  const [doneTodayFilter, setDoneTodayFilter] = useState<"all" | "task" | "log">("all");
  const { t } = useTranslation();
  const c = useThemeColors();

  const taskCount = doneTodayItems.filter((i) => i.kind === "task").length;
  const logCount = doneTodayItems.filter((i) => i.kind === "log").length;
  const visibleDone =
    doneTodayFilter === "all"
      ? doneTodayItems
      : doneTodayItems.filter((i) => i.kind === doneTodayFilter);
  const toggleDoneFilter = (kind: "task" | "log") =>
    setDoneTodayFilter((cur) => (cur === kind ? "all" : kind));

  return (
      <CollapsibleSection
        open={showDoneToday}
        onToggle={() => setShowDoneToday((s) => !s)}
        icon={<Sparkles size={18} color={c.accent} />}
        title={t("views.today.doneToday.title")}
        rightSlot={
          <View className="flex-row flex-wrap items-center gap-1.5">
            {taskCount > 0 && (
              <Pressable
                onPress={() => toggleDoneFilter("task")}
                className="flex-row items-center gap-1 rounded-full border px-2 py-0.5"
                style={{
                  backgroundColor: alpha(
                    c.accent,
                    doneTodayFilter === "task" ? 0.25 : 0.1
                  ),
                  borderColor: alpha(
                    c.accent,
                    doneTodayFilter === "task" ? 0.6 : 0.3
                  ),
                }}
              >
                <CheckCircle2 size={11} color={c.accent} />
                <Text className="text-xs text-accent">
                  {t("views.today.doneToday.tasksLabel", { count: taskCount })}
                </Text>
              </Pressable>
            )}
            {logCount > 0 && (
              <Pressable
                onPress={() => toggleDoneFilter("log")}
                className="flex-row items-center gap-1 rounded-full border px-2 py-0.5"
                style={{
                  backgroundColor: alpha(
                    c.accent2,
                    doneTodayFilter === "log" ? 0.25 : 0.1
                  ),
                  borderColor: alpha(
                    c.accent2,
                    doneTodayFilter === "log" ? 0.6 : 0.3
                  ),
                }}
              >
                <TrendingUp size={11} color={c.accent2} />
                <Text className="text-xs text-accent-2">
                  {t("views.today.doneToday.logsLabel", { count: logCount })}
                </Text>
              </Pressable>
            )}
            {doneTodayEffortHours > 0 && (
              <View
                className="flex-row items-center gap-1 rounded-full border px-2 py-0.5"
                style={{
                  backgroundColor: alpha(c.accent2, 0.15),
                  borderColor: alpha(c.accent2, 0.4),
                }}
              >
                <Clock size={11} color={c.accent2} />
                <Text className="text-xs text-accent-2">
                  {t("views.today.doneToday.hoursWorkedLabel", {
                    hours: doneTodayEffortHours,
                  })}
                </Text>
              </View>
            )}
          </View>
        }
      >
        <View className="gap-3 rounded-xl border border-border bg-surface p-3">
          {todayHoursByProject.length > 0 && (
            <View className="flex-row flex-wrap items-center gap-1.5 border-b border-border pb-2">
              <Text className="mr-1 text-[10px] uppercase tracking-wider text-text-muted">
                {t("views.today.doneToday.hoursByProject")}
              </Text>
              {todayHoursByProject.map(({ project, hours }) => (
                <Pressable
                  key={project.id}
                  onPress={() => jumpToProject(project.id)}
                  className="flex-row items-center gap-1 rounded border px-2 py-0.5"
                  style={{
                    backgroundColor: alpha(c.accent, 0.1),
                    borderColor: alpha(c.accent, 0.3),
                  }}
                >
                  <Clock size={10} color={c.accent} />
                  <Text className="text-xs text-accent">
                    {project.name} · {hours}h
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <View className="gap-2">
            {visibleDone.map((item) => {
              if (item.kind === "task") {
                const proj = projects.find((p) => p.id === item.task.projectId);
                return (
                  <View
                    key={`task-${item.task.id}`}
                    className="flex-row items-start gap-2 border-l-2 pl-2.5"
                    style={{ borderColor: alpha(c.accent, 0.4) }}
                  >
                    <CheckCircle2 size={16} color={c.accent} />
                    <View className="min-w-0 flex-1">
                      <View className="mb-0.5 flex-row flex-wrap items-center gap-1.5">
                        <Text className="text-[10px] font-medium uppercase tracking-wider text-accent">
                          {t("views.today.doneToday.task")}
                        </Text>
                        {proj && (
                          <Pressable onPress={() => jumpToProject(proj.id)}>
                            <Text className="text-xs text-text-muted">
                              · {proj.name}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                      <View className="flex-row flex-wrap items-center gap-2">
                        <Text className="text-sm text-text-muted line-through">
                          {item.task.title}
                        </Text>
                        {item.task.effortHours != null &&
                          <EffortBadge hours={item.task.effortHours} />}
                      </View>
                    </View>
                    <Pressable
                      onPress={() => toggleTask(item.task)}
                      accessibilityLabel={t("views.today.doneToday.undoAria")}
                      hitSlop={8}
                    >
                      <Undo2 size={14} color={c.textMuted} />
                    </Pressable>
                  </View>
                );
              }
              if (item.kind === "routine") {
                return (
                  <View
                    key={`routine-${item.occurrenceId}`}
                    className="flex-row items-start gap-2 border-l-2 pl-2.5"
                    style={{ borderColor: alpha(c.accent, 0.4) }}
                  >
                    <CheckCircle2 size={16} color={c.accent} />
                    <View className="min-w-0 flex-1">
                      <View className="mb-0.5 flex-row flex-wrap items-center gap-1.5">
                        <Text className="text-[10px] font-medium uppercase tracking-wider text-accent">
                          {t("views.today.doneToday.routine")}
                        </Text>
                      </View>
                      <View className="flex-row flex-wrap items-center gap-2">
                        <Text className="text-sm text-text-muted">
                          {item.title}
                        </Text>
                        {item.effortHours != null &&
                          <EffortBadge hours={item.effortHours} />}
                      </View>
                    </View>
                    <Pressable
                      onPress={() => uncompleteOccurrence(item.occurrenceId)}
                      accessibilityLabel={t("views.today.doneToday.undoAria")}
                      hitSlop={8}
                    >
                      <Undo2 size={14} color={c.textMuted} />
                    </Pressable>
                  </View>
                );
              }
              const proj = item.projectId
                ? projects.find((p) => p.id === item.projectId)
                : undefined;
              return (
                <View
                  key={`log-${item.source}-${item.id}`}
                  className="flex-row items-start gap-2 border-l-2 pl-2.5"
                  style={{ borderColor: alpha(c.accent2, 0.4) }}
                >
                  <TrendingUp size={16} color={c.accent2} />
                  <View className="min-w-0 flex-1">
                    <View className="mb-0.5 flex-row flex-wrap items-center gap-1.5">
                      <Text className="text-[10px] font-medium uppercase tracking-wider text-accent-2">
                        {t(
                          item.source === "projectNote"
                            ? "views.today.doneToday.note"
                            : "views.today.doneToday.log"
                        )}
                      </Text>
                      {proj && (
                        <Pressable onPress={() => jumpToProject(proj.id)}>
                          <Text className="text-xs text-text-muted">
                            · {proj.name}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                    <Text className="text-sm text-text-muted">{item.text}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </CollapsibleSection>
    );
}
