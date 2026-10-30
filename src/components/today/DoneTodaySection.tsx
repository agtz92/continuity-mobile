import { memo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { CheckCircle2, Clock, Sunset, TrendingUp, Undo2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import type { Project, Task } from "@/lib/types";
import { alpha, useThemeColors } from "@/theme/useThemeColors";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { FilterChips } from "@/components/ui/FilterChips";
import { IconAction } from "@/components/ui/IconAction";
import { Meta } from "@/components/ui/Meta";
import type { useTodayFocus } from "@/hooks/useTodayFocus";
import type { useProductivityStats } from "@/hooks/useProductivityStats";
import { EffortBadge } from "./EffortBadge";

type FocusModel = ReturnType<typeof useTodayFocus>;
type Stats = ReturnType<typeof useProductivityStats>;
type DoneItem = FocusModel["doneTodayItems"][number];
type DoneFilter = "all" | "task" | "log";

/** Una línea de lo hecho hoy: icono, cintillo + proyecto, texto y deshacer (40 px). */
const DoneLine = memo(function DoneLine({
  item,
  projects,
  last,
  onUndoTask,
  onUndoRoutine,
  onOpenProject,
}: {
  item: DoneItem;
  projects: Project[];
  last: boolean;
  onUndoTask: (task: Task) => void;
  onUndoRoutine: (occurrenceId: string) => void;
  onOpenProject: (id: string) => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const isLog = item.kind === "log";
  const tone = isLog ? c.closed : c.accent;
  const projectId =
    item.kind === "task" ? item.task.projectId : item.kind === "log" ? item.projectId : null;
  const proj = projectId ? projects.find((p) => p.id === projectId) : undefined;
  const kicker =
    item.kind === "task"
      ? t("views.today.doneToday.task")
      : item.kind === "routine"
        ? t("views.today.doneToday.routine")
        : t(item.source === "projectNote" ? "views.today.doneToday.note" : "views.today.doneToday.log");
  const text = item.kind === "task" ? item.task.title : item.kind === "routine" ? item.title : item.text;
  const effort =
    item.kind === "task" ? item.task.effortHours : item.kind === "routine" ? item.effortHours : null;
  const undo =
    item.kind === "task"
      ? () => onUndoTask(item.task)
      : item.kind === "routine"
        ? () => onUndoRoutine(item.occurrenceId)
        : null;

  return (
    <View
      className="flex-row items-start"
      style={{
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.line[14],
      }}
    >
      <View style={{ paddingTop: 2 }}>
        {isLog ? <TrendingUp size={18} color={tone} /> : <CheckCircle2 size={18} color={tone} />}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="mb-0.5" style={{ fontSize: 13, color: c.text3 }}>
          <Meta variant="cintillo" tone="inherit" style={{ color: tone }}>
            {kicker}
          </Meta>
          {proj ? (
            <Text className="font-sans" onPress={() => onOpenProject(proj.id)}>
              {` · ${proj.name}`}
            </Text>
          ) : null}
        </Text>
        <Text
          className="font-sans"
          style={[
            { fontSize: 15, lineHeight: 21, color: c.text3 },
            item.kind === "task" ? { textDecorationLine: "line-through" } : null,
          ]}
        >
          {text}
        </Text>
        {effort != null ? (
          <View className="mt-1 flex-row">
            <EffortBadge hours={effort} />
          </View>
        ) : null}
      </View>
      {undo ? (
        <IconAction
          icon={Undo2}
          label={t("views.today.doneToday.undoAria")}
          onPress={undo}
          size={40}
          iconSize={18}
        />
      ) : null}
    </View>
  );
});

/**
 * "Hecho hoy": tareas, rutinas y logs completados. Breathe: una sola tarjeta
 * con separadores internos; "Hours by project" va **fuera** de la tarjeta;
 * deshacer en caja de 40 px; conteos en la segunda línea de la cabecera.
 */
export function DoneTodaySection({
  doneTodayItems,
  doneTodayEffortHours,
  todayHoursByProject,
  projects,
  jumpToProject,
  toggleTask,
  uncompleteOccurrence,
}: {
  doneTodayItems: FocusModel["doneTodayItems"];
  doneTodayEffortHours: number;
  todayHoursByProject: Stats["todayHoursByProject"];
  projects: Project[];
  jumpToProject: (id: string) => void;
  toggleTask: (t: Task) => void | Promise<void>;
  uncompleteOccurrence: (occurrenceId: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<DoneFilter>("all");
  const { t } = useTranslation();
  const c = useThemeColors();

  const taskCount = doneTodayItems.filter((i) => i.kind === "task").length;
  const logCount = doneTodayItems.filter((i) => i.kind === "log").length;
  const visible =
    filter === "all" ? doneTodayItems : doneTodayItems.filter((i) => i.kind === filter);

  const metaParts = [
    taskCount > 0 ? t("views.today.doneToday.tasksLabel", { count: taskCount }) : null,
    logCount > 0 ? t("views.today.doneToday.logsLabel", { count: logCount }) : null,
  ].filter(Boolean);

  return (
    <CollapsibleSection
      open={open}
      onToggle={() => setOpen((s) => !s)}
      icon={<Sunset size={18} color={c.accent} />}
      title={t("views.today.doneToday.title")}
      meta={
        <>
          {metaParts.join(" · ")}
          {doneTodayEffortHours > 0 ? (
            <Text style={{ color: c.closed }}>
              {metaParts.length ? " · " : ""}
              {t("views.today.doneToday.hoursWorkedLabel", { hours: doneTodayEffortHours })}
            </Text>
          ) : null}
        </>
      }
    >
      <View className="gap-3">
        {todayHoursByProject.length > 0 ? (
          <View className="gap-2">
            <Meta variant="cintillo" tone="muted">
              {t("views.today.doneToday.hoursByProject")}
            </Meta>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {todayHoursByProject.map(({ project, hours }) => (
                <Pressable
                  key={project.id}
                  onPress={() => jumpToProject(project.id)}
                  accessibilityRole="button"
                  className="flex-row items-center gap-1.5 rounded-md px-3 active:opacity-70"
                  style={{ height: 36, backgroundColor: alpha(c.accent, 0.1) }}
                >
                  <Clock size={14} color={c.accent} />
                  <Text className="font-sans-medium" style={{ fontSize: 14, color: c.accent }}>
                    {project.name} · {hours}h
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {taskCount > 0 && logCount > 0 ? (
          <FilterChips<DoneFilter>
            items={[
              { key: "all", label: t("views.today.doneToday.showAll") },
              { key: "task", label: t("views.today.doneToday.tasksLabel", { count: taskCount }) },
              { key: "log", label: t("views.today.doneToday.logsLabel", { count: logCount }) },
            ]}
            value={filter}
            onChange={setFilter}
          />
        ) : null}

        <View
          className="rounded-lg bg-surface"
          style={{ paddingHorizontal: 14, borderWidth: 1, borderColor: c.line[14] }}
        >
          {visible.map((item, i) => (
            <DoneLine
              key={
                item.kind === "task"
                  ? `task-${item.task.id}`
                  : item.kind === "routine"
                    ? `routine-${item.occurrenceId}`
                    : `log-${item.source}-${item.id}`
              }
              item={item}
              projects={projects}
              last={i === visible.length - 1}
              onUndoTask={toggleTask}
              onUndoRoutine={uncompleteOccurrence}
              onOpenProject={jumpToProject}
            />
          ))}
        </View>
      </View>
    </CollapsibleSection>
  );
}
