import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { DASHBOARD_QUERY } from "@/lib/graphql";
import type { Activity, Category, DashboardData, ProjectNote } from "@/lib/types";

// Derivados caros (ordenar cientos de actividades parseando fechas) calculados
// UNA vez por respuesta y compartidos entre todos los consumidores. La caché de
// Apollo devuelve el mismo objeto `dashboard` a cada observador mientras no
// cambie, así que sirve de llave; antes cada uno de los ~17 consumidores
// repetía el sort en su propio `useMemo` con cada respuesta.
const derivedCache = new WeakMap<
  DashboardData,
  { activities: Activity[]; notesByProject: Record<string, ProjectNote[]> }
>();

function derive(dashboard: DashboardData) {
  const hit = derivedCache.get(dashboard);
  if (hit) return hit;
  const activities = [...dashboard.activities].sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
  );
  // Notes grouped by project, sorted newest-edited first within each group.
  const sortedNotes = [...dashboard.projectNotes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const notesByProject: Record<string, ProjectNote[]> = {};
  for (const n of sortedNotes) {
    (notesByProject[n.projectId] ??= []).push(n);
  }
  const out = { activities, notesByProject };
  derivedCache.set(dashboard, out);
  return out;
}

const EMPTY_ACTIVITIES: Activity[] = [];
const EMPTY_NOTES: Record<string, ProjectNote[]> = {};

/**
 * El estado completo del usuario, desde la caché.
 *
 * **Solo un consumidor pide a la red** (`owner: true`, el layout del dashboard,
 * que vive mientras la app esté abierta). El resto lee `cache-first`: montar
 * una pantalla, un formulario o la hoja de captura ya no descarga el dashboard
 * otra vez. Lo mantienen fresco las señales en vivo y el volver a primer plano
 * (`useLiveSync` → `refetchQueries` de todo lo activo) y el pull-to-refresh
 * (`refetch()` siempre va a la red).
 */
export function useDashboardData({ owner = false }: { owner?: boolean } = {}) {
  const { data, loading, error, refetch } = useQuery<{ dashboard: DashboardData }>(
    DASHBOARD_QUERY,
    { fetchPolicy: owner ? "cache-and-network" : "cache-first" }
  );

  const dashboard = data?.dashboard;
  const projects = dashboard?.projects ?? [];
  const tasks = dashboard?.tasks ?? [];
  const ideas = dashboard?.ideas ?? [];
  const categories = dashboard?.categories ?? [];
  const routines = dashboard?.routines ?? [];
  const routineOccurrences = dashboard?.routineOccurrences ?? [];
  const lastBackup = dashboard?.lastBackup ?? null;

  const derived = dashboard ? derive(dashboard) : null;
  const activities = derived?.activities ?? EMPTY_ACTIVITIES;
  const notesByProject = derived?.notesByProject ?? EMPTY_NOTES;

  const categoryById = useMemo<Record<string, Category>>(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  /** True only during the very first load (before any data has come back). */
  const initialLoading = loading && !data;

  return {
    projects,
    tasks,
    ideas,
    activities,
    categories,
    categoryById,
    notesByProject,
    routines,
    routineOccurrences,
    lastBackup,
    loading,
    initialLoading,
    error,
    refetch,
  };
}
