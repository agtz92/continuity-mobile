import { useMutation } from "@apollo/client/react";
import { ARCHIVE_ROUTINE, DASHBOARD_QUERY, DELETE_ROUTINE } from "@/lib/graphql";
import * as outbox from "@/lib/outbox";
import type { IntervalUnit, RecurrenceType } from "@/lib/types";

const refetchAfter = { refetchQueries: [{ query: DASHBOARD_QUERY }] };

export interface RoutineFormInput {
  id?: string;
  title: string;
  description: string;
  recurrenceType: RecurrenceType;
  startDate: string;
  endDate: string | null;
  weekdays: number[];
  intervalN: number | null;
  intervalUnit: IntervalUnit | null;
  monthlyDay: number | null;
  effortHours: number | null;
  projectId: string | null;
}

export function useRoutineMutations() {
  const [archiveRoutineM] = useMutation(ARCHIVE_ROUTINE, refetchAfter);
  const [deleteRoutineM] = useMutation(DELETE_ROUTINE, refetchAfter);

  const saveRoutine = async (r: RoutineFormInput): Promise<boolean> => {
    const data = {
      title: r.title,
      description: r.description,
      recurrenceType: r.recurrenceType,
      startDate: r.startDate,
      endDate: r.endDate,
      weekdays: r.weekdays,
      intervalN: r.intervalN,
      intervalUnit: r.intervalUnit,
      monthlyDay: r.monthlyDay,
      effortHours: r.effortHours,
      projectId: r.projectId || null,
    };
    // Crear y editar funcionan sin red: van por la cola (`lib/outbox`).
    return r.id ? outbox.updateRoutine(r.id, data) : outbox.createRoutine(data);
  };

  const archiveRoutine = async (id: string, archived: boolean): Promise<void> => {
    try {
      await archiveRoutineM({ variables: { id, archived } });
    } catch {
      /* swallow — surface errors at the screen layer */
    }
  };

  const deleteRoutine = async (id: string): Promise<void> => {
    try {
      await deleteRoutineM({ variables: { id } });
    } catch {
      /* swallow — surface errors at the screen layer */
    }
  };

  // Palomear y despalomear funcionan sin red: van por la cola (`lib/outbox`).
  const completeOccurrence = async (
    routineId: string,
    scheduledDate: string
  ): Promise<void> => {
    await outbox.completeOccurrence(routineId, scheduledDate);
  };

  const uncompleteOccurrence = async (id: string): Promise<void> => {
    await outbox.uncompleteOccurrence(id);
  };

  return {
    saveRoutine,
    archiveRoutine,
    deleteRoutine,
    completeOccurrence,
    uncompleteOccurrence,
  };
}
