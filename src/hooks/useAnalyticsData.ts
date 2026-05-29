import { useQuery } from "@apollo/client/react";
import { ANALYTICS_QUERY } from "@/lib/graphql";
import type { AnalyticsData, AnalyticsRange } from "@/lib/types";

export function useAnalyticsData(range: AnalyticsRange) {
  const { data, loading, error, refetch } = useQuery<{
    analytics: AnalyticsData;
  }>(ANALYTICS_QUERY, {
    variables: { range },
    fetchPolicy: "cache-and-network",
  });

  return {
    analytics: data?.analytics ?? null,
    loading,
    initialLoading: loading && !data,
    error,
    refetch,
  };
}
