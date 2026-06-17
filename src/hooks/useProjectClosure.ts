import { useState } from "react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import type { Project } from "@/lib/types";
import { toast } from "@/lib/toast";
import { useProjectMutations } from "@/hooks/useProjectMutations";
import type { PauseNotes } from "@/components/projects/PauseProjectModal";
import type { KillNotes } from "@/components/projects/KillProjectModal";

/** Pulls the GraphQL extensions.code (e.g. CLOSURE_NOTES_REQUIRED) out of an error. */
export function errorCode(e: unknown): string | null {
  if (CombinedGraphQLErrors.is(e)) {
    for (const err of e.errors) {
      const code = err.extensions?.code;
      if (typeof code === "string") return code;
    }
  }
  return null;
}

/**
 * Status-transition helpers for the closure flows. Each saver re-sends the
 * existing project fields plus the new status/notes (saveProject is a full
 * upsert), returns true on success. Toasts mirror the spec copy on success.
 */
export function useProjectClosure() {
  const { saveProject } = useProjectMutations();
  const [saving, setSaving] = useState(false);

  const base = (p: Project) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    why: p.why,
    nextStep: p.nextStep,
    priority: p.priority,
    categoryId: p.categoryId,
    dueDate: p.dueDate,
  });

  const pause = async (p: Project, notes: PauseNotes): Promise<boolean> => {
    setSaving(true);
    const ok = await saveProject({ ...base(p), status: "paused", ...notes });
    setSaving(false);
    if (ok) toast.success("Paused. Future you will thank you.");
    return ok;
  };

  const kill = async (p: Project, notes: KillNotes): Promise<boolean> => {
    setSaving(true);
    const ok = await saveProject({ ...base(p), status: "killed", ...notes });
    setSaving(false);
    if (ok) toast.success("Killed with intention. Lesson saved.");
    return ok;
  };

  /** Resume/revive: set status back with no notes (stored notes are kept). */
  const setStatus = async (
    p: Project,
    status: "active" | "idea"
  ): Promise<boolean> => {
    setSaving(true);
    const ok = await saveProject({ ...base(p), status });
    setSaving(false);
    return ok;
  };

  return { saving, pause, kill, setStatus };
}
