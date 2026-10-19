import { useMutation } from "@apollo/client/react";
import { useTranslation } from "react-i18next";
import {
  CREATE_PROJECT,
  DASHBOARD_QUERY,
  DELETE_PROJECT,
  REORDER_PROJECTS,
  UPDATE_PROJECT,
} from "@/lib/graphql";
import { choiceAsync, confirmAsync } from "@/lib/confirm";
import type { Priority } from "@/lib/types";

const refetchAfter = { refetchQueries: [{ query: DASHBOARD_QUERY }] };

export function useProjectMutations() {
  const { t } = useTranslation();
  const [createProject] = useMutation(CREATE_PROJECT, refetchAfter);
  const [updateProject] = useMutation(UPDATE_PROJECT, refetchAfter);
  const [deleteProject] = useMutation(DELETE_PROJECT, refetchAfter);
  // No refetch: the mutation returns {id, position} per project, which Apollo
  // merges into the normalized cache so the list re-sorts without a round-trip.
  const [reorderProjectsMut] = useMutation(REORDER_PROJECTS);

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

  /**
   * Delete with confirm prompt. With `onKill`, the prompt also offers "Kill"
   * (the closure ritual, which feeds the graveyard stats) as the suggested
   * alternative; picking it calls `onKill` and deletes nothing.
   * Returns true only if the project was actually deleted.
   */
  const deleteProjectWithConfirm = async (
    id: string,
    opts?: { onKill?: () => void }
  ): Promise<boolean> => {
    const title = t("modals.project.deleteConfirm");
    const body = t("modals.project.deleteConfirmBody");
    if (opts?.onKill) {
      const answer = await choiceAsync(
        title,
        `${body}

${t("modals.project.killInsteadNote")}`,
        t("common.delete"),
        t("modals.project.killInstead"),
        t("common.cancel")
      );
      if (answer === "alt") {
        opts.onKill();
        return false;
      }
      if (answer !== "confirm") return false;
    } else if (
      !(await confirmAsync(title, body, t("common.delete"), t("common.cancel")))
    ) {
      return false;
    }
    try {
      await deleteProject({ variables: { id } });
      return true;
    } catch {
      return false;
    }
  };

  /** Persist the manual order ("Mi orden"). Optimistically writes each
   * project's new `position` so the drag sticks instantly. Returns true ok. */
  const reorderProjects = async (orderedIds: string[]): Promise<boolean> => {
    try {
      await reorderProjectsMut({
        variables: { orderedIds },
        optimisticResponse: {
          reorderProjects: orderedIds.map((id, idx) => ({
            __typename: "Project",
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

  return {
    saveProject,
    deleteProject: deleteProjectWithConfirm,
    reorderProjects,
    /** Raw mutations for cases like backup import that need direct access. */
    raw: { createProject, deleteProject },
  };
}
