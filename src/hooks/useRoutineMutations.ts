import { useMutation } from "@apollo/client/react";
import {
  ARCHIVE_ROUTINE,
  COMPLETE_ROUTINE_OCCURRENCE,
  CREATE_ROUTINE,
  DASHBOARD_QUERY,
  DELETE_ROUTINE,
  UNCOMPLETE_ROUTINE_OCCURRENCE,
  UPDATE_ROUTINE,
} from "@/lib/graphql";
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
  const [createRoutine] = useMutation(CREATE_ROUTINE, refetchAfter);
  const [updateRoutine] = useMutation(UPDATE_ROUTINE, refetchAfter);
  const [archiveRoutineM] = useMutation(ARCHIVE_ROUTINE, refetchAfter);
  const [deleteRoutineM] = useMutation(DELETE_ROUTINE, refetchAfter);
  const [completeOccurrenceM] = useMutation(
    COMPLETE_ROUTINE_OCCURRENCE,
    refetchAfter
  );
  const [uncompleteOccurrenceM] = useMutation(
    UNCOMPLETE_ROUTINE_OCCURRENCE,
    refetchAfter
  );

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
    try {
      if (r.id) {
        await updateRoutine({ variables: { id: r.id, data } });
      } else {
        await createRoutine({ variables: { data } });
      }
      return true;
    } catch {
      return false;
    }
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

  const completeOccurrence = async (
    routineId: string,
    scheduledDate: string
  ): Promise<void> => {
    try {
      await completeOccurrenceM({
        variables: { routineId, scheduledDate, note: "" },
      });
    } catch {
      /* swallow — surface errors at the screen layer */
    }
  };

  const uncompleteOccurrence = async (id: string): Promise<void> => {
    try {
      await uncompleteOccurrenceM({ variables: { id } });
    } catch {
      /* swallow — surface errors at the screen layer */
    }
  };

  return {
    saveRoutine,
    archiveRoutine,
    deleteRoutine,
    completeOccurrence,
    uncompleteOccurrence,
  };
}
