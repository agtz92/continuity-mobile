import { useMutation } from "@apollo/client/react";
import { refetchUnlessLive } from "@/lib/liveStatus";
import * as outbox from "@/lib/outbox";
import {
  DASHBOARD_QUERY,
  DELETE_NOTE,
  UPDATE_NOTE,
} from "@/lib/graphql";

// Con el canal en vivo arriba, la señal de esta escritura ya relanza el
// dashboard; pedirlo aquí también era descargarlo dos veces (ver liveStatus).
const refetchAfter = refetchUnlessLive([DASHBOARD_QUERY]);

export function useNoteMutations() {
  const [updateNoteM] = useMutation(UPDATE_NOTE, refetchAfter);
  const [deleteNoteM] = useMutation(DELETE_NOTE, refetchAfter);

  // Agregar funciona sin red (cola); editar y borrar necesitan conexión.
  const addNote = (projectId: string, note: string): Promise<boolean> =>
    outbox.addProjectNote(projectId, note);

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
  };
}
