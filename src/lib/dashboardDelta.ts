import { apolloClient } from "@/lib/apollo";
import { DASHBOARD_DELTA_QUERY, DASHBOARD_QUERY } from "@/lib/graphql";

/**
 * Reconciliar la caché tras **nuestras** escrituras sin bajar el dashboard
 * entero.
 *
 * **El problema.** Cada toque (palomear, capturar) vuelve como señal en vivo y
 * `useLiveSync` relanzaba `DASHBOARD_QUERY` completo: todas las tareas, ideas,
 * notas, rutinas y 60 días de activities, ~10 consultas en el servidor, por un
 * renglón que la cola offline ya había pintado. Con muchos usuarios a la vez
 * esa descarga es la que tumba el backend (prueba de estrés 2026-11-06).
 *
 * **Qué hace esto.** La cola (`lib/outbox/ops.ts`) ya escribe en la caché lo
 * que mandó, y Apollo funde la respuesta de cada mutation por `id`. Lo único
 * que falta es lo que **deriva el servidor**: los campos de los proyectos
 * (`lastActivity`, enfriamiento, atorado) y las activities que registró. Eso
 * trae `dashboardDelta`: cuatro consultas pequeñas en vez de diez grandes.
 *
 * **Cuándo NO alcanza** (`isDeltaSafe`) y se cae al refetch completo:
 * - Un `DELETE` en cualquier tabla salvo activities: los borrados arrastran
 *   cascadas (tareas de un proyecto, blockers de una tarea completada) que la
 *   caché no conoce.
 * - Una tabla fuera de lo que escribe la cola (categorías, blockers,
 *   preferencias…).
 * - El aviso no es eco nuestro: eso lo decide `useLiveSync` con su ventana.
 * - El backend todavía no tiene `dashboardDelta`: la query falla por
 *   validación y se hace el refetch de siempre.
 */

export interface LiveSignal {
  table: string;
  op?: string;
}

/**
 * Tablas cuyo eco cubren la caché local + el delta: lo que escribe la cola y
 * sus efectos laterales en proyectos y activities. Quick Notes no está en el
 * dashboard pero la cola también lo escribe en su propia caché.
 */
const DELTA_TABLES = new Set([
  "core_task",
  "core_idea",
  "core_routine",
  "core_routineoccurrence",
  "core_project",
  "core_activity",
  "core_quicknote",
  "core_notesection",
]);

export function isDeltaSafe(signals: LiveSignal[]): boolean {
  if (signals.length === 0) return false;
  return signals.every((s) => {
    if (!DELTA_TABLES.has(s.table)) return false;
    const op = (s.op ?? "").toUpperCase();
    // Sin `op` no sabemos si fue un borrado: mejor el refetch completo.
    if (!op) return false;
    if (op === "DELETE") return s.table === "core_activity";
    return true;
  });
}

// Margen sobre la activity más nueva cacheada: la cola pinta activities con la
// hora del teléfono, que puede ir algo adelantada a la del servidor. Lo que se
// repita se descarta por id al fundir.
const SINCE_MARGIN_MS = 5 * 60_000;
const SINCE_FALLBACK_MS = 60 * 60_000;

type Row = Record<string, any> & { id: string };
type DashboardResult = { dashboard?: Record<string, unknown> } | null | undefined;
interface Delta {
  projects: Row[];
  activities: Row[];
}

/** Desde cuándo pedir activities, según lo que ya hay en caché. */
export function deltaSince(activities: Array<{ created?: string }> | undefined, now = Date.now()): string {
  let newest = 0;
  for (const a of activities ?? []) {
    const t = a?.created ? Date.parse(a.created) : NaN;
    if (Number.isFinite(t) && t > newest) newest = t;
  }
  const since = newest ? newest - SINCE_MARGIN_MS : now - SINCE_FALLBACK_MS;
  return new Date(since).toISOString();
}

/**
 * El dashboard cacheado con el delta aplicado, o `undefined` para no tocarlo.
 *
 * Proyectos: se reemplaza la lista entera (el delta los trae todos, completos),
 * así también entran los creados y salen los borrados desde otro lado.
 * Activities: se agregan al principio las que no estaban.
 */
export function mergeDelta<T extends DashboardResult>(prev: T, delta: Delta): T | undefined {
  const dash = prev?.dashboard;
  if (!dash || !Array.isArray(dash.activities)) return undefined;
  const current = dash.activities as Row[];
  const known = new Set(current.map((a) => a?.id));
  const fresh = delta.activities.filter((a) => !known.has(a.id));
  return {
    ...prev,
    dashboard: {
      ...dash,
      projects: delta.projects,
      activities: fresh.length ? [...fresh, ...current] : current,
    },
  } as T;
}

/**
 * Pide el delta y lo funde en la caché del dashboard. Resuelve `false` si no
 * se pudo (sin dashboard cacheado, error de red o backend viejo): quien llama
 * hace entonces el refetch completo.
 */
export async function reconcileDashboard(): Promise<boolean> {
  const cache = apolloClient.cache;
  const cached = cache.readQuery({ query: DASHBOARD_QUERY }) as DashboardResult;
  const activities = cached?.dashboard?.activities as Array<{ created?: string }> | undefined;
  if (!cached?.dashboard || !activities) return false;
  try {
    const res = await apolloClient.query<{ dashboardDelta: Delta }>({
      query: DASHBOARD_DELTA_QUERY,
      variables: { since: deltaSince(activities) },
      fetchPolicy: "no-cache",
      errorPolicy: "none",
      context: { silent: true },
    });
    const delta = res.data?.dashboardDelta;
    if (!delta) return false;
    cache.updateQuery({ query: DASHBOARD_QUERY }, (prev: unknown) =>
      mergeDelta(prev as DashboardResult, delta)
    );
    return true;
  } catch {
    return false;
  }
}
