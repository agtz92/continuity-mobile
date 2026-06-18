import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { getUsage } from "@/lib/assistantApi";

export type Plan = "free" | "pro" | "studio" | "admin";

/**
 * Per-plan active-project cap (mirrors the web backend quota). `studio`/`admin`
 * are unlimited → Infinity, which callers treat as "no cap line".
 */
const PROJECT_CAP: Record<Plan, number> = {
  free: 3,
  pro: 25,
  studio: Infinity,
  admin: Infinity,
};

/** Statuses that count against the plan's active-project cap. */
const COUNTING_STATUSES = new Set([
  "idea",
  "active",
  "stalled",
  "paused",
  "launched",
]);

export function countsTowardCap(status: string): boolean {
  return COUNTING_STATUSES.has(status);
}

/**
 * Lightweight current-plan reader. Reuses the assistant `/usage/` endpoint
 * (same source the Billing screen uses) so we get the plan without spinning up
 * a chat conversation. Returns `null` until resolved, or if the backend is
 * offline — callers must degrade gracefully (skip the cap line) on `null`.
 */
export function usePlan(): { plan: Plan | null; cap: number | null } {
  const [plan, setPlan] = useState<Plan | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getUsage()
        .then((u) => {
          if (active) setPlan(u.plan);
        })
        .catch(() => {
          /* assistant backend may be offline — leave plan null */
        });
      return () => {
        active = false;
      };
    }, []),
  );

  return { plan, cap: plan ? PROJECT_CAP[plan] : null };
}
