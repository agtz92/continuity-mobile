import { useMutation } from "@apollo/client/react";
import {
  CREATE_TASK,
  DASHBOARD_QUERY,
  DELETE_TASK,
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

  const saveTask = async (t: {
    id?: string;
    title: string;
    projectId: string | null;
    dueDate: string | null;
    done: boolean;
    effortHours: number | null;
  }): Promise<boolean> => {
    const data = {
      title: t.title,
      projectId: t.projectId,
      dueDate: t.dueDate,
      done: t.done,
      effortHours: t.effortHours,
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

  const deleteTask = async (id: string): Promise<void> => {
    try {
      await deleteTaskM({ variables: { id } });
    } catch {
      /* swallow — surface errors at the screen layer */
    }
  };

  return {
    saveTask,
    toggleTask,
    deleteTask,
    raw: { createTask, deleteTask: deleteTaskM },
  };
}
