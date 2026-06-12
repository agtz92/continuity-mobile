import { useMutation } from "@apollo/client/react";
import {
  ADD_NOTE_SECTION,
  CREATE_QUICK_NOTE,
  DELETE_NOTE_SECTION,
  DELETE_QUICK_NOTE,
  QUICK_NOTES_QUERY,
  REORDER_NOTE_SECTIONS,
  SET_QUICK_NOTE_PINNED,
  UPDATE_NOTE_SECTION,
  UPDATE_QUICK_NOTE,
} from "@/lib/graphql";
import type { NoteSection, QuickNote } from "@/lib/types";

const refetchAfter = { refetchQueries: [{ query: QUICK_NOTES_QUERY }] };

type NotePatch = {
  title?: string;
  categoryId?: string | null;
  projectId?: string | null;
  pinned?: boolean;
};

export function useQuickNoteMutations() {
  const [createM] = useMutation(CREATE_QUICK_NOTE, refetchAfter);
  const [updateM] = useMutation(UPDATE_QUICK_NOTE, refetchAfter);
  const [pinM] = useMutation(SET_QUICK_NOTE_PINNED, refetchAfter);
  const [deleteM] = useMutation(DELETE_QUICK_NOTE, refetchAfter);
  const [addSectionM] = useMutation(ADD_NOTE_SECTION, refetchAfter);
  const [updateSectionM] = useMutation(UPDATE_NOTE_SECTION, refetchAfter);
  const [deleteSectionM] = useMutation(DELETE_NOTE_SECTION, refetchAfter);
  const [reorderM] = useMutation(REORDER_NOTE_SECTIONS, refetchAfter);

  const createNote = async (patch: NotePatch = {}): Promise<QuickNote | null> => {
    try {
      const res = await createM({
        variables: {
          data: {
            title: patch.title ?? "",
            categoryId: patch.categoryId ?? null,
            projectId: patch.projectId ?? null,
            pinned: patch.pinned ?? false,
          },
        },
      });
      return ((res.data as { createQuickNote?: QuickNote } | null)?.createQuickNote) ?? null;
    } catch {
      return null;
    }
  };

  const updateNote = async (
    id: string,
    data: Required<NotePatch>
  ): Promise<boolean> => {
    try {
      await updateM({ variables: { id, data } });
      return true;
    } catch {
      return false;
    }
  };

  const setPinned = async (id: string, pinned: boolean): Promise<void> => {
    try {
      await pinM({ variables: { id, pinned } });
    } catch {
      /* surface errors at the screen layer */
    }
  };

  const deleteNote = async (id: string): Promise<void> => {
    try {
      await deleteM({ variables: { id } });
    } catch {
      /* surface errors at the screen layer */
    }
  };

  const addSection = async (
    noteId: string,
    patch: { heading?: string; body?: string; collapsed?: boolean } = {}
  ): Promise<NoteSection | null> => {
    try {
      const res = await addSectionM({
        variables: {
          noteId,
          data: {
            heading: patch.heading ?? "",
            body: patch.body ?? "",
            collapsed: patch.collapsed ?? false,
            position: null,
          },
        },
      });
      return ((res.data as { addNoteSection?: NoteSection } | null)?.addNoteSection) ?? null;
    } catch {
      return null;
    }
  };

  const updateSection = async (
    id: string,
    data: { heading: string; body: string; collapsed: boolean }
  ): Promise<boolean> => {
    try {
      await updateSectionM({ variables: { id, data } });
      return true;
    } catch {
      return false;
    }
  };

  const deleteSection = async (id: string): Promise<void> => {
    try {
      await deleteSectionM({ variables: { id } });
    } catch {
      /* surface errors at the screen layer */
    }
  };

  const reorderSections = async (
    noteId: string,
    orderedIds: string[]
  ): Promise<void> => {
    try {
      await reorderM({ variables: { noteId, orderedIds } });
    } catch {
      /* surface errors at the screen layer */
    }
  };

  return {
    createNote,
    updateNote,
    setPinned,
    deleteNote,
    addSection,
    updateSection,
    deleteSection,
    reorderSections,
  };
}
