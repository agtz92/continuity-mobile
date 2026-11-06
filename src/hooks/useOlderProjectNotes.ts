
import { useCallback, useEffect, useRef, useState } from "react";
import { useApolloClient } from "@apollo/client/react";
import { ACTIVITY_QUERY, activityWindowStart } from "@/lib/graphql";
import type { Activity } from "@/lib/types";

const PAGE = 50;

/**
 * Las notas de bitácora de un proyecto que el dashboard ya no trae (anteriores
 * a `DASHBOARD_ACTIVITY_DAYS`), bajo demanda y por páginas. Mismo patrón que
 * `useOlderCompletedTasks`. Espejo de
 * `continuity/frontend/src/hooks/useOlderProjectNotes.ts`.
 *
 * Pagina por cursor de fecha: cada página pide lo anterior a la nota más vieja
 * ya cargada (`until` es inclusivo en el servidor, así que se descartan
 * repetidos por id). Nada se pide hasta `load()`.
 */
export function useOlderProjectNotes(projectId: string) {
  const client = useApolloClient();
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [started, setStarted] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const cursor = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (loading || exhausted) return;
    cursor.current ??= activityWindowStart();
    setLoading(true);
    setError(false);
    setStarted(true);
    try {
      const res = await client.query<{ activity: Activity[] }>({
        query: ACTIVITY_QUERY,
        variables: { projectId, kinds: ["note"], until: cursor.current, limit: PAGE },
        fetchPolicy: "network-only",
      });
      const page = res.data?.activity ?? [];
      let fresh = 0;
      setItems((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        const add = page.filter((a) => !seen.has(a.id));
        fresh = add.length;
        return [...prev, ...add];
      });
      const oldest = page[page.length - 1]?.created;
      if (oldest) cursor.current = oldest;
      if (page.length < PAGE || (page.length > 0 && fresh === 0)) setExhausted(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [client, exhausted, loading, projectId]);

  const reset = useCallback(() => {
    cursor.current = null;
    setItems([]);
    setStarted(false);
    setExhausted(false);
    setError(false);
  }, []);

  // Otro proyecto en el mismo panel: lo cargado era del anterior.
  useEffect(() => reset(), [projectId, reset]);

  return { items, load, reset, loading, error, started, exhausted };
}
