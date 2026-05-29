import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { DASHBOARD_QUERY } from "@/lib/graphql";
import type { Activity, Category, DashboardData, ProjectNote } from "@/lib/types";

export function useDashboardData() {
  const { data, loading, error, refetch } = useQuery<{ dashboard: DashboardData }>(
    DASHBOARD_QUERY,
    { fetchPolicy: "cache-and-network" }
  );

  const projects = data?.dashboard.projects ?? [];
  const tasks = data?.dashboard.tasks ?? [];
  const ideas = data?.dashboard.ideas ?? [];
  const categories = data?.dashboard.categories ?? [];
  const routines = data?.dashboard.routines ?? [];
  const routineOccurrences = data?.dashboard.routineOccurrences ?? [];
  const lastBackup = data?.dashboard.lastBackup ?? null;

  // Notes grouped by project, sorted newest-edited first within each group.
  const notesByProject = useMemo<Record<string, ProjectNote[]>>(() => {
    const list: ProjectNote[] = data?.dashboard.projectNotes ?? [];
    const sorted = [...list].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    const out: Record<string, ProjectNote[]> = {};
    for (const n of sorted) {
      (out[n.projectId] ??= []).push(n);
    }
    return out;
  }, [data]);

  const categoryById = useMemo<Record<string, Category>>(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  // Activity feed (all kinds), sorted newest-first.
  const activities = useMemo<Activity[]>(() => {
    const list = data?.dashboard.activities ?? [];
    return [...list].sort(
      (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
    );
  }, [data]);

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
