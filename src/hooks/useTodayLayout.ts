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

  // Initialize local state from server ONCE, when the first response lands.
  // After that, the mutation's cache update keeps the query in sync — resyncing
  // on every server-data change would clobber pending optimistic edits when
  // the user exits edit mode before the debounce fires.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    if (!data) return;
    setOrder(serverState.order);
    setHidden(serverState.hidden);
    initializedRef.current = true;
  }, [data, serverState.order, serverState.hidden]);

  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useCallback(
    (nextOrder: TodaySectionId[], nextHidden: Set<TodaySectionId>) => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      const hiddenArr = Array.from(nextHidden);
      pendingTimerRef.current = setTimeout(() => {
        updateMutation({
          variables: { order: nextOrder, hidden: hiddenArr },
          optimisticResponse: {
            updateTodayLayout: {
              __typename: "TodayLayout",
              order: nextOrder,
              hidden: hiddenArr,
            },
          },
          update: (cache, { data: mutData }) => {
            const payload = (
              mutData as { updateTodayLayout?: LayoutPayload } | null
            )?.updateTodayLayout;
            if (!payload) return;
            cache.writeQuery({
              query: TODAY_LAYOUT_QUERY,
              data: { todayLayout: payload },
            });
          },
        }).catch((err) => {
          // eslint-disable-next-line no-console
          console.error("[useTodayLayout] update failed:", err);
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
      const result = await resetMutation({
        update: (cache, { data: mutData }) => {
          const payload = (
            mutData as { resetTodayLayout?: LayoutPayload } | null
          )?.resetTodayLayout;
          if (!payload) return;
          cache.writeQuery({
            query: TODAY_LAYOUT_QUERY,
            data: { todayLayout: payload },
          });
        },
      });
      const payload = (
        result.data as { resetTodayLayout?: LayoutPayload } | null
      )?.resetTodayLayout;
      const next = reconcile(payload ?? undefined);
      setOrder(next.order);
      setHidden(next.hidden);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[useTodayLayout] reset failed:", err);
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
