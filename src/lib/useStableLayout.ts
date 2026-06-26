import { useMemo, useState } from "react";

/** One row in a frozen layout: which project, and (for Smart) which section. */
export type LayoutEntry = { id: string; section: string | null };

export interface StableLayout {
  /** Frozen order of entries (ids + section), stable while editing. */
  entries: LayoutEntry[];
  /** True when the live "ideal" layout differs from the frozen one — the user
   *  can opt into re-sorting instead of having rows jump while editing. */
  isStale: boolean;
  /** Re-snapshot to the current ideal layout (the "Reordenar" affordance). */
  resync: () => void;
}

/**
 * Freezes a sorted/sectioned layout so individual edits don't reshuffle the
 * list under the user. Recomputes only when `signature` changes (sort mode,
 * filters, search) or when `resync()` is called. Mirror of the web hook.
 */
export function useStableLayout(
  ideal: LayoutEntry[],
  liveIds: Set<string>,
  signature: string
): StableLayout {
  const [frozen, setFrozen] = useState<{ sig: string; entries: LayoutEntry[] }>(
    () => ({ sig: signature, entries: ideal })
  );

  if (frozen.sig !== signature) {
    setFrozen({ sig: signature, entries: ideal });
  }

  const idealById = useMemo(() => {
    const m = new Map<string, LayoutEntry>();
    for (const e of ideal) m.set(e.id, e);
    return m;
  }, [ideal]);

  const entries = useMemo(() => {
    const frozenIds = new Set(frozen.entries.map((e) => e.id));
    const kept = frozen.entries.filter((e) => liveIds.has(e.id));
    const added: LayoutEntry[] = [];
    for (const id of liveIds) {
      if (!frozenIds.has(id)) {
        added.push(idealById.get(id) ?? { id, section: null });
      }
    }
    return [...added, ...kept];
  }, [frozen, liveIds, idealById]);

  const isStale = useMemo(() => {
    if (entries.length !== ideal.length) return false;
    for (let i = 0; i < ideal.length; i++) {
      if (entries[i].id !== ideal[i].id) return true;
      if (entries[i].section !== ideal[i].section) return true;
    }
    return false;
  }, [entries, ideal]);

  const resync = () => setFrozen({ sig: signature, entries: ideal });

  return { entries, isStale, resync };
}
