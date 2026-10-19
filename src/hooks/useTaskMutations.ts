import { useMutation } from "@apollo/client/react";
import {
  ADD_TASK_BLOCKER,
  CREATE_TASK,
  DASHBOARD_QUERY,
  DELETE_TASK,
  REMOVE_TASK_BLOCKER,
  REORDER_PROJECT_TASKS,
  TOGGLE_TASK,
  UPDATE_TASK,
} from "@/lib/graphql";
import type { Task } from "@/lib/types";

const refetchAfter = { refetchQueries: [{ query: DASHBOARD_QUERY }] };

export function useTaskMutations() {
  const [createTask] = useMutation(CREATE_TASK, refetchAfter);
  const [updateTask] = useMutation(UPDATE_TASK, refetchAfter);
  const [toggleTaskM] = useMutation(TOGGLE_TASK, refetchAfter);
  const [deleteTaskM] = useMutation(DELETE_TASK, refetchAfter);
  const [addBlockerM] = useMutation(ADD_TASK_BLOCKER, refetchAfter);
  const [removeBlockerM] = useMutation(REMOVE_TASK_BLOCKER, refetchAfter);
  // Sin refetch: la respuesta trae id+position y Apollo la funde en la caché.
  const [reorderProjectTasksM] = useMutation(REORDER_PROJECT_TASKS);

  const saveTask = async (t: {
    id?: string;
    title: string;
    projectId: string | null;
    dueDate: string | null;
    done: boolean;
    effortHours: number | null;
    /** Opcionales: si no se pasan, el backend deja la tarea sin hora. */
    dueTime?: string | null;
    durationMinutes?: number | null;
  }): Promise<boolean> => {
    const data = {
      title: t.title,
      projectId: t.projectId,
      dueDate: t.dueDate,
      done: t.done,
      effortHours: t.effortHours,
      ...(t.dueTime !== undefined ? { dueTime: t.dueTime } : {}),
      ...(t.durationMinutes !== undefined ? { durationMinutes: t.durationMinutes } : {}),
    };
    try {
      if (t.id) {
        await updateTask({ variables: { id: t.id, data } });
      } else {
        await createTask({ variables: { data } });
      }
      return true;
    } catch {
      return false;
    }
  };

  const toggleTask = async (t: Task): Promise<void> => {
    try {
      await toggleTaskM({ variables: { id: t.id } });
    } catch {
      /* swallow — surface errors at the screen layer */
    }
  };

  /** Persiste el orden manual de las tareas pendientes de un proyecto. La
   * respuesta optimista fija `position` para que la fila no rebote al soltar.
   * Espejo del hook web. */
  const reorderProjectTasks = async (
    projectId: string,
    orderedIds: string[]
  ): Promise<boolean> => {
    try {
      await reorderProjectTasksM({
        variables: { projectId, orderedIds },
        optimisticResponse: {
          reorderProjectTasks: orderedIds.map((id, idx) => ({
            __typename: "Task" as const,
            id,
            position: idx,
          })),
        },
      });
      return true;
    } catch {
      return false;
    }
  };

  const deleteTask = async (id: string): Promise<void> => {
    try {
      await deleteTaskM({ variables: { id } });
    } catch {
      /* swallow — surface errors at the screen layer */
    }
  };

  /**
   * Adds a blocker to a task — exactly one of `blockingTaskId` (another task) or
   * `externalDescription` (free text) is provided, mirroring the web. Returns
   * false on error so the screen can keep the input. The dashboard refetch
   * brings the new blocker back on the task's `blockers` array.
   */
  const addTaskBlocker = async (data: {
    blockedTaskId: string;
    blockingTaskId?: string;
    externalDescription?: string;
  }): Promise<boolean> => {
    try {
      await addBlockerM({ variables: { data } });
      return true;
    } catch {
      return false;
    }
  };

  const removeTaskBlocker = async (id: string): Promise<boolean> => {
    try {
      await removeBlockerM({ variables: { id } });
      return true;
    } catch {
      return false;
    }
  };

  return {
    saveTask,
    toggleTask,
    deleteTask,
    addTaskBlocker,
    removeTaskBlocker,
    reorderProjectTasks,
    raw: { createTask, deleteTask: deleteTaskM },
  };
}
