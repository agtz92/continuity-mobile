import { useQuery } from "@apollo/client/react";
import { QUICK_NOTES_QUERY } from "@/lib/graphql";
import type { QuickNote } from "@/lib/types";

/**
 * Loads the user's Quick Notes. Kept out of DASHBOARD_QUERY so note bodies
 * (which can be large) only load lazily when the Notes screen mounts.
 */
export function useQuickNotes() {
  const { data, loading, error, refetch } = useQuery<{ quickNotes: QuickNote[] }>(
    QUICK_NOTES_QUERY,
    { fetchPolicy: "cache-and-network" }
  );

  return {
    quickNotes: data?.quickNotes ?? [],
    loading,
    initialLoading: loading && !data,
    error,
    refetch,
  };
}
