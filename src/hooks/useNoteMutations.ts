import { useMutation } from "@apollo/client/react";
import {
  ADD_NOTE,
  DASHBOARD_QUERY,
  DELETE_NOTE,
  UPDATE_NOTE,
} from "@/lib/graphql";

const refetchAfter = { refetchQueries: [{ query: DASHBOARD_QUERY }] };

export function useNoteMutations() {
  const [addNoteM] = useMutation(ADD_NOTE, refetchAfter);
  const [updateNoteM] = useMutation(UPDATE_NOTE, refetchAfter);
  const [deleteNoteM] = useMutation(DELETE_NOTE, refetchAfter);

  const addNote = async (projectId: string, note: string): Promise<boolean> => {
    try {
      await addNoteM({ variables: { projectId, note } });
      return true;
    } catch {
      return false;
    }
  };

  const editNote = async (id: string, note: string): Promise<boolean> => {
    try {
      await updateNoteM({ variables: { id, note } });
      return true;
    } catch {
      return false;
    }
  };

  const deleteNote = async (id: string): Promise<void> => {
    try {
      await deleteNoteM({ variables: { id } });
    } catch {
      /* swallow — surface errors at the screen layer */
    }
  };

  return {
    addNote,
    editNote,
    deleteNote,
    raw: { addNote: addNoteM },
  };
}
