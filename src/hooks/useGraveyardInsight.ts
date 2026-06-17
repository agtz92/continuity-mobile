import { useQuery } from "@apollo/client/react";
import { GRAVEYARD_INSIGHT_QUERY } from "@/lib/graphql";
import type { GraveyardInsight } from "@/lib/types";

/**
 * The cached graveyard autopsy (Layer B). `body` is populated only when the
 * user has >= 3 deaths; otherwise it's empty and the view shows an empty state.
 */
export function useGraveyardInsight() {
  const { data, loading } = useQuery<{ graveyardInsight: GraveyardInsight | null }>(
    GRAVEYARD_INSIGHT_QUERY,
    { fetchPolicy: "cache-and-network" }
  );
  return { insight: data?.graveyardInsight ?? null, loading };
}
