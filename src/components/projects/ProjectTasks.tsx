import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import {
  NestableDraggableFlatList,
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { GripVertical, Plus } from "lucide-react-native";
import type { Project, Task } from "@/lib/types";
import { askAsync } from "@/lib/confirm";
import { toast } from "@/lib/toast";
import { selectionFeedback } from "@/lib/feedback";
import { suggestDueDateAfterMove } from "@/lib/taskOrder";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { TaskRow } from "@/components/tasks/TaskRow";
import { ShowMoreList } from "@/components/ui/ShowMoreList";
import { useThemeColors } from "@/theme/useThemeColors";

const GRIP_W = 36;
const GRIP_H = 44;

/**
 * Tareas del detalle de proyecto (1g): pendientes en orden manual
 * (arrastrables con el ⠿ de 36×44), hechas debajo por fecha de cierre, y
 * "New task" como línea punteada de 48 px. Long-press sobre la fila o el ⠿
 * reordena. Debe vivir dentro de un `NestableScrollContainer`.
 */
export function ProjectTasks({
  project,
  pending,
  completed,
}: {
  project: Project;
  pending: Task[];
  completed: Task[];
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { toggleTask, deleteTask, saveTask, reorderProjectTasks } = useTaskMutations();

  const onEdit = useCallback(
    (tk: Task) => router.push({ pathname: "/task-form", params: { id: tk.id } }),
    [router]
  );

  // Mover cuenta como replanear: la tarea toma la fecha de la vecina que
  // rebasó. Sin fecha propia se aplica sola; con fecha, se pregunta (y solo si
  // quedó fuera de orden). Misma regla que la web (`suggestDueDateAfterMove`).
  const fmtDay = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, { day: "numeric", month: "short" });
  const rescheduleAfterMove = async (
    task: Task,
    ordered: Task[],
    direction: "up" | "down"
  ) => {
    const dueDate = suggestDueDateAfterMove(ordered, task.id, direction);
    if (!dueDate) return;
    const apply = () =>
      saveTask({
        id: task.id,
        title: task.title,
        projectId: task.projectId,
        dueDate,
        done: task.done,
        effortHours: task.effortHours,
        dueTime: task.dueTime,
        durationMinutes: task.durationMinutes,
      });
    if (!task.dueDate) {
      if (await apply()) {
        toast.success(t("views.projects.card.dateAutoSet", { date: fmtDay(dueDate) }), 2000);
      }
      return;
    }
    const ok = await askAsync(
      t("views.projects.card.moveDateTitle", { title: task.title }),
      t("views.projects.card.moveDateBody", {
        from: fmtDay(task.dueDate),
        to: fmtDay(dueDate),
      }),
      t("views.projects.card.moveDateConfirm"),
      t("views.projects.card.moveDateKeep")
    );
    if (ok) await apply();
  };

  const renderTask = (task: Task) => (
    <TaskRow
      task={task}
      project={undefined}
      onToggle={toggleTask}
      onDelete={deleteTask}
      onEdit={onEdit}
    />
  );

  return (
    <View className="gap-3">
      {pending.length === 0 && completed.length === 0 ? (
        <Text className="font-sans italic" style={{ fontSize: 15, color: c.text3 }}>
          {t("views.projects.card.noTasks")}
        </Text>
      ) : (
        <View className="gap-2">
          <NestableDraggableFlatList
            data={pending}
            keyExtractor={(tk) => tk.id}
            contentContainerStyle={{ gap: 8 }}
            onDragEnd={({ data, from, to }) => {
              if (from === to) return;
              selectionFeedback();
              void reorderProjectTasks(project.id, data.map((tk) => tk.id));
              void rescheduleAfterMove(pending[from], data, to < from ? "up" : "down");
            }}
            renderItem={({ item, drag, isActive }: RenderItemParams<Task>) => (
              <ScaleDecorator>
                {/* Long-press sobre toda la fila reordena; el ⠿ dentro de la
                    tarjeta es la afordancia visual (y también arrastra). */}
                <TaskRow
                  task={item}
                  project={undefined}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onEdit={onEdit}
                  onLongPress={isActive ? undefined : drag}
                  dragHandle={
                    <Pressable
                      onLongPress={drag}
                      delayLongPress={150}
                      disabled={isActive}
                      accessibilityRole="button"
                      accessibilityLabel={t("views.projects.card.dragTask")}
                      className="items-center justify-center"
                      style={{ width: GRIP_W, height: GRIP_H, marginRight: -8 }}
                    >
                      <GripVertical size={18} color={c.text5} />
                    </Pressable>
                  }
                />
              </ScaleDecorator>
            )}
          />
          <View className="gap-2">
            <ShowMoreList
              items={completed}
              initialCount={5}
              itemKey={(task) => task.id}
              renderItem={(task) => renderTask(task)}
            />
          </View>
        </View>
      )}
      <Pressable
        onPress={() =>
          router.push({ pathname: "/task-form", params: { projectId: project.id } })
        }
        accessibilityRole="button"
        className="flex-row items-center justify-center gap-2 rounded-lg active:opacity-70"
        style={{
          height: 48,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: c.line[34],
        }}
      >
        <Plus size={16} color={c.text3} />
        <Text className="font-sans-medium" style={{ fontSize: 15, color: c.text3 }}>
          {t("modals.task.newTitle")}
        </Text>
      </Pressable>
    </View>
  );
}
