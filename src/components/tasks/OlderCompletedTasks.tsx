import { Fragment, type ReactNode } from "react";
import { Pressable, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useOlderCompletedTasks } from "@/hooks/useOlderCompletedTasks";
import { SIZE } from "@/theme/tokens";
import type { Task } from "@/lib/types";

/**
 * "Ver completadas anteriores": el final de una lista de completadas.
 * Espejo de `continuity/frontend/src/components/tasks/OlderCompletedTasks.tsx`.
 *
 * El dashboard solo trae las completadas de los últimos
 * `DASHBOARD_DONE_TASK_DAYS` días; esto pide las anteriores al tocar. Necesita
 * red (no hay versión offline del historial). `count` (de
 * `project.olderDoneCount`) dice cuántas hay; sin él el botón no lleva número y
 * se oculta cuando una página vuelve incompleta.
 *
 * `renderItem` recibe `onReopened`: llámalo tras reabrir una de estas tareas
 * para vaciar la lista (la tarea vuelve al dashboard con el refetch).
 */
export function OlderCompletedTasks({
  projectId,
  count,
  excludeIds,
  renderItem,
}: {
  projectId?: string;
  count?: number;
  excludeIds?: Set<string>;
  renderItem: (task: Task, onReopened: () => void) => ReactNode;
}) {
  const { t } = useTranslation();
  const older = useOlderCompletedTasks(projectId);

  if (count === 0) return null;
  const visible = excludeIds ? older.items.filter((x) => !excludeIds.has(x.id)) : older.items;
  const remaining = count === undefined ? undefined : Math.max(0, count - older.items.length);
  const canLoad = !older.exhausted && (remaining === undefined || remaining > 0);

  const label = older.loading
    ? t("completedHistory.loading")
    : older.error
      ? t("completedHistory.error")
      : older.started
        ? t("completedHistory.loadMore")
        : remaining !== undefined
          ? t("completedHistory.showCount", { count: remaining })
          : t("completedHistory.show");

  return (
    <>
      {visible.map((task) => (
        <Fragment key={task.id}>{renderItem(task, older.reset)}</Fragment>
      ))}
      {canLoad && (
        <Pressable
          onPress={() => void older.load()}
          disabled={older.loading}
          accessibilityRole="button"
          accessibilityLabel={label}
          className="self-start justify-center"
          style={{ minHeight: SIZE.hit }}
        >
          <Text className="font-sans-medium text-accent" style={{ fontSize: 15 }}>
            {label}
          </Text>
        </Pressable>
      )}
    </>
  );
}
