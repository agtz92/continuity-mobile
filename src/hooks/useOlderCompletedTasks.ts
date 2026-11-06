
import { useCallback, useRef, useState } from "react";
import { useApolloClient } from "@apollo/client/react";
import { COMPLETED_TASKS_QUERY, doneWindowStart } from "@/lib/graphql";
import type { Task } from "@/lib/types";

const PAGE = 50;

/**
 * Las completadas que el dashboard ya no trae (anteriores a
 * `DASHBOARD_DONE_TASK_DAYS`), bajo demanda y por páginas.
 *
 * Nada se pide hasta `load()`: la mayoría nunca abre el historial, y para eso
 * se recortó el dashboard. Los resultados viven en estado local, no en la lista
 * del dashboard, así que no inflan lo que el resto de la app recorre.
 *
 * `reset()` vacía lo cargado: llamarlo tras reabrir una de estas tareas (deja de
 * ser "completada anterior" y vuelve al dashboard con el refetch).
 */
export function useOlderCompletedTasks(projectId?: string) {
  const client = useApolloClient();
  const [items, setItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [started, setStarted] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  // Fijo desde la primera página: si se recalculara, el offset se correría.
  const before = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (loading || exhausted) return;
    before.current ??= doneWindowStart();
    setLoading(true);
    setError(false);
    setStarted(true);
    try {
      const res = await client.query<{ completedTasks: Task[] }>({
        query: COMPLETED_TASKS_QUERY,
        variables: {
          before: before.current,
          projectId: projectId ?? null,
          offset: items.length,
          limit: PAGE,
        },
        fetchPolicy: "network-only",
      });
      const page = res.data?.completedTasks ?? [];
      setItems((prev) => {
        const seen = new Set(prev.map((t) => t.id));
        return [...prev, ...page.filter((t) => !seen.has(t.id))];
      });
      if (page.length < PAGE) setExhausted(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [client, exhausted, items.length, loading, projectId]);

  const reset = useCallback(() => {
    before.current = null;
    setItems([]);
    setStarted(false);
    setExhausted(false);
    setError(false);
  }, []);

  return { items, load, reset, loading, error, started, exhausted };
}
