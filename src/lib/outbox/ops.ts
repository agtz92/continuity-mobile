import type { ApolloCache } from "@apollo/client";
import type { DocumentNode } from "graphql";
import {
  ADD_NOTE,
  ADD_NOTE_SECTION,
  COMPLETE_ROUTINE_OCCURRENCE,
  CREATE_IDEA,
  CREATE_QUICK_NOTE,
  CREATE_TASK,
  DASHBOARD_QUERY,
  QUICK_NOTES_QUERY,
  SET_TASK_DONE,
  UNCOMPLETE_ROUTINE_OCCURRENCE,
  UPDATE_NOTE_SECTION,
  UPDATE_QUICK_NOTE,
  UPDATE_TASK,
} from "@/lib/graphql";

/**
 * Las operaciones que se pueden hacer sin red y cómo se ve cada una en la
 * caché antes de que el servidor conteste.
 *
 * Cada `apply` escribe el resultado **ya**, con exactamente los campos que
 * seleccionan `DASHBOARD_QUERY` / `QUICK_NOTES_QUERY`: si falta uno, Apollo
 * lee la query como incompleta y la pantalla se queda vacía. Lo que el
 * servidor deriva y aquí no sabemos (enfriamiento, `lastActivity`, contadores)
 * llega con el refetch que se hace al vaciar la cola.
 *
 * Los ids los genera el teléfono (`newId`) y el servidor los respeta: crear
 * dos veces con el mismo id devuelve la misma fila. Así no hay que remapear
 * nada cuando una operación posterior se refiere a algo creado offline.
 */

export type OpKind =
  | "task.create"
  | "task.update"
  | "task.setDone"
  | "idea.create"
  | "projectNote.add"
  | "routine.complete"
  | "routine.uncomplete"
  | "quickNote.create"
  | "quickNote.update"
  | "section.add"
  | "section.update";

type Vars = Record<string, any>;

interface OpSpec {
  mutation: DocumentNode;
  /** Escribe en la caché lo que el servidor va a devolver. */
  apply: (cache: ApolloCache, vars: Vars) => void;
  /** Operaciones con la misma llave se pisan: solo cuenta la última. */
  coalesceKey?: (vars: Vars) => string;
}

const now = () => new Date().toISOString();

export function newId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ---- Helpers de caché ------------------------------------------------------

type DashboardResult = { dashboard?: Record<string, unknown> } | null;
type NotesResult = { quickNotes?: Array<Record<string, any>> } | null;

/** Cambia una lista del dashboard; sin dashboard cacheado no hace nada. */
function editDashboardList(
  cache: ApolloCache,
  list: string,
  fn: (items: Array<Record<string, any>>) => Array<Record<string, any>>
) {
  cache.updateQuery({ query: DASHBOARD_QUERY }, (prev: unknown) => {
    const data = prev as DashboardResult;
    const items = data?.dashboard?.[list];
    if (!data?.dashboard || !Array.isArray(items)) return undefined;
    return { ...data, dashboard: { ...data.dashboard, [list]: fn(items) } };
  });
}

function prependIfNew(entity: Record<string, any>) {
  return (items: Array<Record<string, any>>) =>
    items.some((i) => i?.id === entity.id) ? items : [entity, ...items];
}

function editQuickNotes(
  cache: ApolloCache,
  fn: (notes: Array<Record<string, any>>) => Array<Record<string, any>>
) {
  cache.updateQuery({ query: QUICK_NOTES_QUERY }, (prev: unknown) => {
    const data = prev as NotesResult;
    if (!Array.isArray(data?.quickNotes)) return undefined;
    return { ...data, quickNotes: fn(data.quickNotes) };
  });
}

function modify(cache: ApolloCache, typename: string, id: string, values: Vars) {
  const fields: Record<string, () => unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) fields[key] = () => value;
  }
  cache.modify({ id: cache.identify({ __typename: typename, id }), fields });
}

// ---- Entidades como las devuelve el servidor -------------------------------

export function localTask(id: string, data: Vars): Record<string, any> {
  const reason = (data.blocker ?? "").trim();
  const created = now();
  return {
    __typename: "Task",
    id,
    title: data.title,
    projectId: data.projectId ?? null,
    dueDate: data.dueDate ?? null,
    done: Boolean(data.done),
    completedAt: data.done ? created : null,
    created,
    effortHours: data.effortHours ?? null,
    dueTime: data.dueTime ?? null,
    durationMinutes: data.durationMinutes ?? null,
    blockedSince: reason ? created : null,
    blockedReason: reason || null,
    position: 0,
    blockers: reason
      ? [
          {
            __typename: "TaskBlocker",
            id: newId(),
            blockedTaskId: id,
            blockingTaskId: null,
            externalDescription: reason,
            created,
          },
        ]
      : [],
  };
}

export function localQuickNote(id: string, data: Vars): Record<string, any> {
  const created = now();
  return {
    __typename: "QuickNote",
    id,
    title: data.title ?? "",
    categoryId: data.categoryId ?? null,
    projectId: data.projectId ?? null,
    pinned: Boolean(data.pinned),
    created,
    updatedAt: created,
    sections: [],
  };
}

export function localSection(
  id: string,
  noteId: string,
  data: Vars,
  position: number
): Record<string, any> {
  const created = now();
  return {
    __typename: "NoteSection",
    id,
    noteId,
    heading: data.heading ?? "",
    body: data.body ?? "",
    position,
    collapsed: Boolean(data.collapsed),
    created,
    updatedAt: created,
  };
}

/** Siguiente posición de sección según lo cacheado (el servidor hace lo mismo). */
export function nextSectionPosition(cache: ApolloCache, noteId: string): number {
  const data = cache.readQuery({ query: QUICK_NOTES_QUERY }) as NotesResult;
  const note = data?.quickNotes?.find((n) => n.id === noteId);
  const positions = (note?.sections ?? []).map((s: any) => Number(s.position) || 0);
  return positions.length ? Math.max(...positions) + 1 : 0;
}

// ---- Especificaciones ------------------------------------------------------

export const OPS: Record<OpKind, OpSpec> = {
  "task.create": {
    mutation: CREATE_TASK,
    apply: (cache, v) =>
      editDashboardList(cache, "tasks", prependIfNew(localTask(v.data.id, v.data))),
  },
  "task.update": {
    mutation: UPDATE_TASK,
    apply: (cache, v) => {
      const d = v.data;
      modify(cache, "Task", v.id, {
        title: d.title,
        projectId: d.projectId ?? null,
        dueDate: d.dueDate ?? null,
        done: Boolean(d.done),
        effortHours: d.effortHours ?? null,
        dueTime: d.dueTime,
        durationMinutes: d.durationMinutes,
      });
    },
    coalesceKey: (v) => `task.update:${v.id}`,
  },
  "task.setDone": {
    mutation: SET_TASK_DONE,
    apply: (cache, v) =>
      modify(cache, "Task", v.id, {
        done: Boolean(v.done),
        completedAt: v.done ? now() : null,
      }),
    coalesceKey: (v) => `task.setDone:${v.id}`,
  },
  "idea.create": {
    mutation: CREATE_IDEA,
    apply: (cache, v) =>
      editDashboardList(
        cache,
        "ideas",
        prependIfNew({
          __typename: "Idea",
          id: v.data.id,
          title: v.data.title,
          description: v.data.description ?? "",
          why: v.data.why ?? "",
          created: now(),
        })
      ),
  },
  "projectNote.add": {
    mutation: ADD_NOTE,
    apply: (cache, v) =>
      editDashboardList(
        cache,
        "activities",
        prependIfNew({
          __typename: "Activity",
          id: v.id,
          kind: "note",
          entityId: null,
          entityTitle: "",
          projectId: v.projectId,
          targetProjectId: null,
          note: v.note,
          previousValue: "",
          newValue: "",
          created: now(),
        })
      ),
  },
  "routine.complete": {
    mutation: COMPLETE_ROUTINE_OCCURRENCE,
    apply: (cache, v) =>
      editDashboardList(cache, "routineOccurrences", (items) =>
        items.some(
          (o) => o.routineId === v.routineId && o.scheduledDate === v.scheduledDate
        )
          ? items
          : [
              ...items,
              {
                __typename: "RoutineOccurrence",
                id: v.id,
                routineId: v.routineId,
                scheduledDate: v.scheduledDate,
                completedAt: now(),
                note: v.note ?? "",
                created: now(),
              },
            ]
      ),
  },
  "routine.uncomplete": {
    mutation: UNCOMPLETE_ROUTINE_OCCURRENCE,
    apply: (cache, v) =>
      editDashboardList(cache, "routineOccurrences", (items) =>
        items.filter((o) => o.id !== v.id)
      ),
  },
  "quickNote.create": {
    mutation: CREATE_QUICK_NOTE,
    apply: (cache, v) =>
      editQuickNotes(cache, (notes) =>
        notes.some((n) => n.id === v.data.id)
          ? notes
          : [localQuickNote(v.data.id, v.data), ...notes]
      ),
  },
  "quickNote.update": {
    mutation: UPDATE_QUICK_NOTE,
    apply: (cache, v) =>
      modify(cache, "QuickNote", v.id, {
        title: v.data.title,
        categoryId: v.data.categoryId ?? null,
        projectId: v.data.projectId ?? null,
        pinned: Boolean(v.data.pinned),
        updatedAt: now(),
      }),
    coalesceKey: (v) => `quickNote.update:${v.id}`,
  },
  "section.add": {
    mutation: ADD_NOTE_SECTION,
    apply: (cache, v) => {
      const position = v.data.position ?? nextSectionPosition(cache, v.noteId);
      const section = localSection(v.data.id, v.noteId, v.data, position);
      editQuickNotes(cache, (notes) =>
        notes.map((n) =>
          n.id !== v.noteId || n.sections.some((s: any) => s.id === section.id)
            ? n
            : { ...n, updatedAt: now(), sections: [...n.sections, section] }
        )
      );
    },
  },
  "section.update": {
    mutation: UPDATE_NOTE_SECTION,
    apply: (cache, v) =>
      modify(cache, "NoteSection", v.id, {
        heading: v.data.heading,
        body: v.data.body,
        collapsed: v.data.collapsed,
        updatedAt: now(),
      }),
    coalesceKey: (v) => `section.update:${v.id}`,
  },
};
