import type { ProjectStatus } from "@/lib/types";

/**
 * Statuses that appear in daily views (Today) and notifications.
 *
 * Manual mirror of the backend's `DAILY_VIEW_PROJECT_STATUSES`
 * (core/services/projects.py). There is no type codegen, so keep this in sync
 * with both the backend and `frontend/src/lib/projectStatus.ts`.
 *
 * Standalone tasks (no project) are always visible regardless of this list —
 * callers must special-case `task.projectId == null`.
 */
export const DAILY_VIEW_PROJECT_STATUSES = [
  "active",
  "idea",
  "launched",
] as const satisfies readonly ProjectStatus[];

export function isDailyViewStatus(status: ProjectStatus): boolean {
  return (DAILY_VIEW_PROJECT_STATUSES as readonly ProjectStatus[]).includes(
    status
  );
}
