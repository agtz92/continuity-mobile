import { useMutation } from "@apollo/client/react";
import { useTranslation } from "react-i18next";
import {
  DELETE_NOTE_SECTION,
  DELETE_QUICK_NOTE,
  QUICK_NOTES_QUERY,
  REORDER_NOTE_SECTIONS,
  SET_QUICK_NOTE_PINNED,
} from "@/lib/graphql";
import * as outbox from "@/lib/outbox";
import { confirmAsync } from "@/lib/confirm";
import { deleteFeedback } from "@/lib/feedback";
import type { NoteSection, QuickNote } from "@/lib/types";

const refetchAfter = { refetchQueries: [{ query: QUICK_NOTES_QUERY }] };

type NotePatch = {
  title?: string;
  categoryId?: string | null;
  projectId?: string | null;
  pinned?: boolean;
};

export function useQuickNoteMutations() {
  const { t } = useTranslation();
  // Crear/editar notas y secciones funciona sin red: va por la cola
  // (`lib/outbox`). Fijar, borrar y reordenar siguen necesitando conexión.
  const [pinM] = useMutation(SET_QUICK_NOTE_PINNED, refetchAfter);
  const [deleteM] = useMutation(DELETE_QUICK_NOTE, refetchAfter);
  const [deleteSectionM] = useMutation(DELETE_NOTE_SECTION, refetchAfter);
  const [reorderM] = useMutation(REORDER_NOTE_SECTIONS, refetchAfter);

  const createNote = (patch: NotePatch = {}): Promise<QuickNote | null> =>
    outbox.createQuickNote<QuickNote>({
      title: patch.title ?? "",
      categoryId: patch.categoryId ?? null,
      projectId: patch.projectId ?? null,
      pinned: patch.pinned ?? false,
    });

  const updateNote = (id: string, data: Required<NotePatch>): Promise<boolean> =>
    outbox.updateQuickNote(id, data);

  const setPinned = async (id: string, pinned: boolean): Promise<void> => {
    try {
      await pinM({ variables: { id, pinned } });
    } catch {
      /* surface errors at the screen layer */
    }
  };

  /**
   * Asks first — naming the note and how many sections go with it — then
   * deletes. Resolves true only when the user confirmed and the delete landed,
   * so the caller knows whether to leave the editor.
   */
  const deleteNote = async (note: QuickNote): Promise<boolean> => {
    const title = note.title.trim();
    const ok = await confirmAsync(
      title
        ? t("views.quickNotes.deleteNoteConfirm", { title })
        : t("views.quickNotes.deleteNoteConfirmUntitled"),
      t("views.quickNotes.deleteNoteConfirmBody", { sections: note.sections.length }),
      t("views.quickNotes.deleteNoteConfirmCta"),
      t("common.cancel"),
    );
    if (!ok) return false;
    try {
      await deleteM({ variables: { id: note.id } });
      return true;
    } catch {
      return false;
    }
  };

  const addSection = async (
    noteId: string,
    patch: { heading?: string; body?: string; collapsed?: boolean } = {}
  ): Promise<NoteSection | null> =>
    outbox.addNoteSection<NoteSection>(noteId, {
      heading: patch.heading ?? "",
      body: patch.body ?? "",
      collapsed: patch.collapsed ?? false,
    });

  const updateSection = (
    id: string,
    data: { heading: string; body: string; collapsed: boolean }
  ): Promise<boolean> => outbox.updateNoteSection(id, data);

  /**
   * `draft` is what the card shows right now (it may hold unsaved edits). An
   * empty section goes without asking; one with content asks first.
   */
  const deleteSection = async (
    id: string,
    draft: { heading: string; body: string }
  ): Promise<boolean> => {
    const heading = draft.heading.trim();
    if (heading || draft.body.trim()) {
      const ok = await confirmAsync(
        heading
          ? t("views.quickNotes.deleteSectionConfirm", { heading })
          : t("views.quickNotes.deleteSectionConfirmUntitled"),
        t("views.quickNotes.deleteSectionConfirmBody"),
        t("views.quickNotes.deleteSectionConfirmCta"),
        t("common.cancel"),
      );
      if (!ok) return false;
    } else {
      deleteFeedback();
    }
    try {
      await deleteSectionM({ variables: { id } });
      return true;
    } catch {
      return false;
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
