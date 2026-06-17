import { useMutation } from "@apollo/client/react";
import {
  CREATE_PROJECT,
  DASHBOARD_QUERY,
  DELETE_PROJECT,
  UPDATE_PROJECT,
} from "@/lib/graphql";
import { confirmAsync } from "@/lib/confirm";
import type { Priority } from "@/lib/types";

const refetchAfter = { refetchQueries: [{ query: DASHBOARD_QUERY }] };

export function useProjectMutations() {
  const [createProject] = useMutation(CREATE_PROJECT, refetchAfter);
  const [updateProject] = useMutation(UPDATE_PROJECT, refetchAfter);
  const [deleteProject] = useMutation(DELETE_PROJECT, refetchAfter);

  /** Save (create or update). Returns true on success, false on failure. */
  const saveProject = async (p: {
    id?: string;
    name: string;
    description: string;
    why: string;
    nextStep: string;
    status: string;
    priority: Priority;
    categoryId: string | null;
    dueDate: string | null;
    // Optional closure notes — only sent on the relevant transition.
    pausedContext?: string;
    pausedNextAction?: string;
    pausedBlocker?: string;
    killedReason?: string;
    killedLearnings?: string;
    killedWouldRestart?: string;
  }): Promise<boolean> => {
    const data: Record<string, unknown> = {
      name: p.name,
      description: p.description,
      why: p.why,
      nextStep: p.nextStep,
      status: p.status,
      priority: p.priority,
      categoryId: p.categoryId,
      dueDate: p.dueDate,
    };
    // Only include closure notes when provided so we never overwrite stored
    // notes with empty strings on unrelated edits.
    if (p.pausedContext !== undefined) data.pausedContext = p.pausedContext;
    if (p.pausedNextAction !== undefined)
      data.pausedNextAction = p.pausedNextAction;
    if (p.pausedBlocker !== undefined) data.pausedBlocker = p.pausedBlocker;
    if (p.killedReason !== undefined) data.killedReason = p.killedReason;
    if (p.killedLearnings !== undefined) data.killedLearnings = p.killedLearnings;
    if (p.killedWouldRestart !== undefined)
      data.killedWouldRestart = p.killedWouldRestart;
    try {
      if (p.id) {
        await updateProject({ variables: { id: p.id, data } });
      } else {
        await createProject({ variables: { data } });
      }
      return true;
    } catch {
      return false;
    }
  };

  /** Delete with confirm prompt. Returns true if user confirmed and call succeeded. */
  const deleteProjectWithConfirm = async (id: string): Promise<boolean> => {
    const ok = await confirmAsync(
      "Delete project?",
      "This deletes the project and all its tasks."
    );
    if (!ok) return false;
    try {
      await deleteProject({ variables: { id } });
      return true;
    } catch {
      return false;
    }
  };

  return {
    saveProject,
    deleteProject: deleteProjectWithConfirm,
    /** Raw mutations for cases like backup import that need direct access. */
    raw: { createProject, deleteProject },
  };
}
