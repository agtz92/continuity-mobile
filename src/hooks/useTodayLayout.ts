import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  RESET_TODAY_LAYOUT,
  TODAY_LAYOUT_QUERY,
  UPDATE_TODAY_LAYOUT,
} from "../lib/graphql";
import {
  NON_HIDEABLE_TODAY_IDS,
  TODAY_SECTION_IDS,
  type TodaySectionId,
} from "../lib/todaySections";

type LayoutPayload = { order: string[]; hidden: string[] };

function reconcile(raw: LayoutPayload | undefined): {
  order: TodaySectionId[];
  hidden: Set<TodaySectionId>;
} {
  const canonical = new Set<string>(TODAY_SECTION_IDS);
  const stored = (raw?.order ?? []).filter((id): id is TodaySectionId =>
    canonical.has(id)
  );
  const seen = new Set(stored);
  const order = stored.concat(
    TODAY_SECTION_IDS.filter((id) => !seen.has(id))
  );
  const hidden = new Set<TodaySectionId>(
    (raw?.hidden ?? []).filter(
      (id): id is TodaySectionId =>
        canonical.has(id) && !NON_HIDEABLE_TODAY_IDS.has(id as TodaySectionId)
    )
  );
  return { order, hidden };
}

const DEBOUNCE_MS = 600;

export function useTodayLayout() {
  const { data } = useQuery<{ todayLayout: LayoutPayload }>(TODAY_LAYOUT_QUERY, {
    fetchPolicy: "cache-first",
  });
  const [updateMutation] = useMutation(UPDATE_TODAY_LAYOUT);
  const [resetMutation] = useMutation(RESET_TODAY_LAYOUT);

  const serverState = useMemo(() => reconcile(data?.todayLayout), [data]);

  const [order, setOrder] = useState<TodaySectionId[]>(serverState.order);
  const [hidden, setHidden] = useState<Set<TodaySectionId>>(serverState.hidden);
  const [editMode, setEditMode] = useState(false);

  // Sync server -> local whenever server response refreshes, except while
  // the user is mid-drag (edit mode) — avoids clobbering uncommitted state.
  useEffect(() => {
    if (editMode) return;
    if (!data) return;
    setOrder(serverState.order);
    setHidden(serverState.hidden);
  }, [data, editMode, serverState.order, serverState.hidden]);

  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useCallback(
    (nextOrder: TodaySectionId[], nextHidden: Set<TodaySectionId>) => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = setTimeout(() => {
        updateMutation({
          variables: {
            order: nextOrder,
            hidden: Array.from(nextHidden),
          },
        }).catch(() => {
          setOrder(serverState.order);
          setHidden(serverState.hidden);
        });
      }, DEBOUNCE_MS);
    },
    [updateMutation, serverState.order, serverState.hidden]
  );

  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    };
  }, []);

  const toggleVisibility = useCallback(
    (id: TodaySectionId) => {
      if (NON_HIDEABLE_TODAY_IDS.has(id)) return;
      setHidden((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        flush(order, next);
        return next;
      });
    },
    [flush, order]
  );

  const setOrderDirect = useCallback(
    (next: TodaySectionId[]) => {
      setOrder(next);
      flush(next, hidden);
    },
    [flush, hidden]
  );

  const reset = useCallback(async () => {
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    try {
      const result = await resetMutation();
      const data = result.data as
        | { resetTodayLayout: LayoutPayload }
        | undefined
        | null;
      const payload = data?.resetTodayLayout;
      const next = reconcile(payload);
      setOrder(next.order);
      setHidden(next.hidden);
    } catch {
      // ignore — user can retry
    }
  }, [resetMutation]);

  return {
    order,
    hidden,
    editMode,
    setEditMode,
    toggleVisibility,
    setOrderDirect,
    reset,
    isVisible: (id: TodaySectionId) => !hidden.has(id),
  };
}

export type UseTodayLayoutReturn = ReturnType<typeof useTodayLayout>;
