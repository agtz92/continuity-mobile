import { useMemo } from "react";
import type { Activity, Idea, Project, Task } from "@/lib/types";
import {
  computeStreak,
  daysActiveThisWeek,
  daysSince,
  hoursSince,
  isCompletedToday,
} from "@/lib/date";

const COMEBACK_GAP_DAYS = 7;
const COMEBACK_FRESH_HOURS = 24;
const STALE_IDEA_DAYS = 30;
const QUICK_WIN_OPEN_TASKS_MAX = 2;
const ALMOST_THERE_PCT = 0.8;

export type ProjectProgress = {
  project: Project;
  doneCount: number;
  totalCount: number;
  donePct: number;
  openCount: number;
  totalEffortHours: number;
  todayEffortHours: number;
};

export type SleepingProject = {
  project: Project;
  days: number;
  bucket: "7-14" | "15-30" | "30+";
};

export function useProductivityStats({
  projects,
  tasks,
  ideas,
  activities,
}: {
  projects: Project[];
  tasks: Task[];
  ideas: Idea[];
  activities: Activity[];
}) {
  // ---------------------------------------------------------------------------
  // Streak + activity-day metrics. After the slice-2 unification, every
  // meaningful event lives in `Activity` (notes, completed tasks, creates,
  // status changes, etc.), so streak counting just maps over `activities`.
  // ---------------------------------------------------------------------------
  const activityTimestamps = useMemo(
    () => activities.map((a) => a.created),
    [activities]
  );

  const streak = useMemo(
    () => computeStreak(activityTimestamps),
    [activityTimestamps]
  );

  const activeThisWeek = useMemo(
    () => daysActiveThisWeek(activityTimestamps),
    [activityTimestamps]
  );

  // ---------------------------------------------------------------------------
  // Per-project progress: completion %, open count, total effort hours
  // (historical), and effort hours invested *today*.
  // ---------------------------------------------------------------------------
  const projectProgressById = useMemo(() => {
    const map = new Map<string, ProjectProgress>();
    for (const p of projects) {
      const projectTasks = tasks.filter((t) => t.projectId === p.id);
      const doneCount = projectTasks.filter((t) => t.done).length;
      const totalCount = projectTasks.length;
      const donePct = totalCount === 0 ? 0 : doneCount / totalCount;
      const totalEffortHours =
        Math.round(
          projectTasks
            .filter((t) => t.done && t.effortHours != null)
            .reduce((acc, t) => acc + (t.effortHours as number), 0) * 10
        ) / 10;
      const todayEffortHours =
        Math.round(
          projectTasks
            .filter(
              (t) =>
                t.done &&
                isCompletedToday(t.completedAt) &&
                t.effortHours != null
            )
            .reduce((acc, t) => acc + (t.effortHours as number), 0) * 10
        ) / 10;
      map.set(p.id, {
        project: p,
        doneCount,
        totalCount,
        donePct,
        openCount: totalCount - doneCount,
        totalEffortHours,
        todayEffortHours,
      });
    }
    return map;
  }, [projects, tasks]);

  // Today's hours grouped by project — drives the Done-today breakdown.
  const todayHoursByProject = useMemo(() => {
    const out: { project: Project; hours: number }[] = [];
    for (const p of projects) {
      const stats = projectProgressById.get(p.id);
      if (stats && stats.todayEffortHours > 0) {
        out.push({ project: p, hours: stats.todayEffortHours });
      }
    }
    return out.sort((a, b) => b.hours - a.hours);
  }, [projects, projectProgressById]);

  // ---------------------------------------------------------------------------
  // Sleeping projects: active/idea status with ≥7 days idle, bucketed for the
  // "rescue" rail. Sorted oldest-first to surface the most-abandoned at the top.
  // ---------------------------------------------------------------------------
  const sleepingProjects = useMemo<SleepingProject[]>(() => {
    const out: SleepingProject[] = [];
    for (const p of projects) {
      if (!["active", "idea"].includes(p.status)) continue;
      const days = daysSince(p.lastActivity) ?? 0;
      if (days < 7) continue;
      const bucket: SleepingProject["bucket"] =
        days <= 14 ? "7-14" : days <= 30 ? "15-30" : "30+";
      out.push({ project: p, days, bucket });
    }
    return out.sort((a, b) => b.days - a.days);
  }, [projects]);

  // ---------------------------------------------------------------------------
  // Comebacks: a project whose latest activity was within the last 24h AND
  // whose previous activity was >7 days before that. Used to celebrate
  // resuming an abandoned project. Computed per-project from updates +
  // task completions.
  // ---------------------------------------------------------------------------
  const comebackProjectIds = useMemo(() => {
    const byProject = new Map<string, number[]>();
    const push = (id: string | null, ts: number) => {
      if (!id) return;
      if (!byProject.has(id)) byProject.set(id, []);
      byProject.get(id)!.push(ts);
    };
    for (const a of activities) push(a.projectId, new Date(a.created).getTime());
    const set = new Set<string>();
    const now = Date.now();
    const freshCutoff = COMEBACK_FRESH_HOURS * 60 * 60 * 1000;
    const gapCutoff = COMEBACK_GAP_DAYS * 24 * 60 * 60 * 1000;
    for (const [pid, stamps] of byProject) {
      if (stamps.length < 2) continue;
      stamps.sort((a, b) => b - a);
      const [latest, prev] = stamps;
      if (now - latest <= freshCutoff && latest - prev >= gapCutoff) {
        set.add(pid);
      }
    }
    return set;
  }, [activities]);

  // Days between latest and previous activity — used to show "Retomado tras Nd".
  const comebackGapByProject = useMemo(() => {
    const map = new Map<string, number>();
    if (comebackProjectIds.size === 0) return map;
    const byProject = new Map<string, number[]>();
    const push = (id: string | null, ts: number) => {
      if (!id) return;
      if (!byProject.has(id)) byProject.set(id, []);
      byProject.get(id)!.push(ts);
    };
    for (const a of activities) push(a.projectId, new Date(a.created).getTime());
    for (const pid of comebackProjectIds) {
      const stamps = byProject.get(pid);
      if (!stamps || stamps.length < 2) continue;
      stamps.sort((a, b) => b - a);
      const gapDays = Math.floor(
        (stamps[0] - stamps[1]) / (24 * 60 * 60 * 1000)
      );
      map.set(pid, gapDays);
    }
    return map;
  }, [comebackProjectIds, activities]);

  // ---------------------------------------------------------------------------
  // Stale ideas: created >30 days ago and never promoted. (Promotion deletes
  // the Idea row and creates a Project, so any Idea still here is unpromoted.)
  // ---------------------------------------------------------------------------
  const staleIdeas = useMemo<Idea[]>(() => {
    return ideas
      .filter((i) => (daysSince(i.created) ?? 0) >= STALE_IDEA_DAYS)
      .sort(
        (a, b) =>
          (daysSince(b.created) ?? 0) - (daysSince(a.created) ?? 0)
      );
  }, [ideas]);

  // ---------------------------------------------------------------------------
  // Easy-close opportunities: active/idea projects with very few open tasks
  // (quick wins) or ≥80% complete (almost there). Both buckets exclude
  // launched/archived since those are already shipped.
  // ---------------------------------------------------------------------------
  const closableProjects = useMemo(() => {
    const quickWins: ProjectProgress[] = [];
    const almostThere: ProjectProgress[] = [];
    for (const p of projects) {
      if (!["active", "idea"].includes(p.status)) continue;
      const stats = projectProgressById.get(p.id);
      if (!stats) continue;
      if (stats.openCount === 0) continue;
      if (stats.totalCount === 0) continue;
      if (stats.donePct >= ALMOST_THERE_PCT) {
        almostThere.push(stats);
      } else if (stats.openCount <= QUICK_WIN_OPEN_TASKS_MAX) {
        quickWins.push(stats);
      }
    }
    quickWins.sort((a, b) => a.openCount - b.openCount);
    almostThere.sort((a, b) => b.donePct - a.donePct);
    return { quickWins, almostThere };
  }, [projects, projectProgressById]);

  // Convenience lookup for "is this card a comeback right now" (within 24h).
  const comebackHoursLeft = (projectId: string) => {
    if (!comebackProjectIds.has(projectId)) return null;
    const project = projects.find((p) => p.id === projectId);
    if (!project) return null;
    const elapsed = hoursSince(project.lastActivity) ?? 0;
    return Math.max(0, COMEBACK_FRESH_HOURS - elapsed);
  };

  return {
    streak,
    activeThisWeek,
    projectProgressById,
    todayHoursByProject,
    sleepingProjects,
    comebackProjectIds,
    comebackGapByProject,
    comebackHoursLeft,
    staleIdeas,
    closableProjects,
  };
}
