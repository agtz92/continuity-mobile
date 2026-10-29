import { apolloCache } from "@/lib/apollo";
import {
  localQuickNote,
  localSection,
  newId,
  nextSectionPosition,
} from "./ops";
import { submit } from "./queue";

/**
 * Lo que los hooks llaman en vez de `useMutation` para las operaciones que
 * funcionan sin red. Cada una pinta el cambio al instante y lo encola (ver
 * `queue.ts`); resuelven `false` solo si el servidor lo rechazó.
 */

export {
  discardFailed,
  failedCount,
  failedOps,
  flushOutbox,
  pendingCount,
  purgeOutbox,
  refreshAll,
  retryFailed,
  startOutbox,
  subscribePending,
  type FailedOp,
} from "./queue";
export { quotaMessage } from "./quota";

export interface TaskData {
  title: string;
  projectId: string | null;
  dueDate: string | null;
  done: boolean;
  effortHours: number | null;
  dueTime?: string | null;
  durationMinutes?: number | null;
  /** Solo al crear: razón de bloqueo externa (captura rápida). */
  blocker?: string;
}

export function createTask(data: TaskData): Promise<boolean> {
  return submit("task.create", { data: { ...data, id: newId() } });
}

export function updateTask(id: string, data: TaskData): Promise<boolean> {
  return submit("task.update", { id, data });
}

export function setTaskDone(id: string, done: boolean): Promise<boolean> {
  return submit("task.setDone", { id, done });
}

export function createIdea(data: {
  title: string;
  description: string;
  why: string;
}): Promise<boolean> {
  return submit("idea.create", { data: { ...data, id: newId() } });
}

/** Update de proyecto (activity `note`). */
export function addProjectNote(projectId: string, note: string): Promise<boolean> {
  return submit("projectNote.add", { id: newId(), projectId, note });
}

export interface RoutineData {
  title: string;
  description: string;
  recurrenceType: string;
  startDate: string;
  endDate: string | null;
  weekdays: number[];
  intervalN: number | null;
  intervalUnit: string | null;
  monthlyDay: number | null;
  effortHours: number | null;
  projectId: string | null;
}

export function createRoutine(data: RoutineData): Promise<boolean> {
  return submit("routine.create", { data: { ...data, id: newId() } });
}

export function updateRoutine(id: string, data: RoutineData): Promise<boolean> {
  return submit("routine.update", { id, data });
}

export function completeOccurrence(
  routineId: string,
  scheduledDate: string
): Promise<boolean> {
  return submit("routine.complete", {
    id: newId(),
    routineId,
    scheduledDate,
    note: "",
  });
}

export function uncompleteOccurrence(id: string): Promise<boolean> {
  return submit("routine.uncomplete", { id });
}

type NoteData = {
  title: string;
  categoryId: string | null;
  projectId: string | null;
  pinned: boolean;
};

/** Devuelve la nota tal como queda en caché (el editor la abre por id). */
export async function createQuickNote<T>(data: NoteData): Promise<T | null> {
  const id = newId();
  const ok = await submit("quickNote.create", { data: { ...data, id } });
  return ok ? (localQuickNote(id, data) as T) : null;
}

export function updateQuickNote(id: string, data: NoteData): Promise<boolean> {
  return submit("quickNote.update", { id, data });
}

export async function addNoteSection<T>(
  noteId: string,
  patch: { heading: string; body: string; collapsed: boolean }
): Promise<T | null> {
  const id = newId();
  // La posición la decide el servidor (al final); aquí solo para pintarla.
  const position = nextSectionPosition(apolloCache, noteId);
  const data = { ...patch, position: null, id };
  const ok = await submit("section.add", { noteId, data });
  return ok ? (localSection(id, noteId, data, position) as T) : null;
}

export function updateNoteSection(
  id: string,
  data: { heading: string; body: string; collapsed: boolean }
): Promise<boolean> {
  return submit("section.update", { id, data });
}
