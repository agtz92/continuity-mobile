export type ProjectStatus =
  | "idea"
  | "active"
  | "stalled"
  | "paused"
  | "launched"
  | "killed"
  | "archived";

export type Priority = "critical" | "high" | "medium" | "low";

export interface Category {
  id: string;
  name: string;
  color: string;
  created: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  why: string;
  nextStep: string;
  status: ProjectStatus;
  priority: Priority;
  categoryId: string | null;
  lastActivity: string;
  created: string;
  dueDate: string | null;
  // Closure notes (paused). Empty string when unset (backend default="").
  pausedContext?: string;
  pausedNextAction?: string;
  pausedBlocker?: string;
  pausedAt?: string | null;
  // Closure notes (killed).
  killedReason?: string;
  killedLearnings?: string;
  killedWouldRestart?: string;
  killedAt?: string | null;
  killedAiReflection?: string;
  // Stalled (auto-detected at 14 days idle).
  stalledAt?: string | null;
  /** Manual order ("Mi orden" sort). Dense 0..N once reordered; 0 by default. */
  position?: number;
}

export interface GraveyardInsight {
  body: string;
  deathsCount: number;
  computedAt: string | null;
  isStale: boolean;
}

export interface ProjectNote {
  id: string;
  projectId: string;
  title: string;
  body: string;
  created: string;
  updatedAt: string;
}

export interface TaskBlocker {
  id: string;
  blockedTaskId: string;
  blockingTaskId: string | null;
  externalDescription: string;
  created: string;
}

export interface Task {
  id: string;
  title: string;
  projectId: string | null;
  dueDate: string | null;
  done: boolean;
  completedAt: string | null;
  created: string;
  effortHours: number | null;
  dueTime: string | null; // "HH:MM:SS" or null = all-day
  durationMinutes: number | null;
  blockers: TaskBlocker[];
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  why: string;
  created: string;
}

export interface NoteSection {
  id: string;
  noteId: string;
  heading: string;
  body: string;
  position: number;
  collapsed: boolean;
  created: string;
  updatedAt: string;
}

export interface QuickNote {
  id: string;
  title: string;
  categoryId: string | null;
  projectId: string | null;
  pinned: boolean;
  sections: NoteSection[];
  created: string;
  updatedAt: string;
}

export type ActivityKind =
  | "note"
  | "project_created"
  | "project_deleted"
  | "project_status_changed"
  | "project_due_date_changed"
  | "task_created"
  | "task_completed"
  | "task_deleted"
  | "task_due_date_changed"
  | "idea_created"
  | "idea_deleted"
  | "quick_note_created"
  | "quick_note_deleted"
  | "idea_promoted"
  | "routine_created"
  | "routine_completed"
  | "routine_deleted";

export type RecurrenceType = "once" | "weekly_days" | "every_n" | "monthly_day";

export type IntervalUnit = "days" | "weeks" | "months";

export interface Routine {
  id: string;
  title: string;
  description: string;
  recurrenceType: RecurrenceType;
  startDate: string; // ISO date "YYYY-MM-DD"
  endDate: string | null;
  weekdays: number[]; // 0=mon..6=sun
  intervalN: number | null;
  intervalUnit: IntervalUnit | null;
  monthlyDay: number | null;
  effortHours: number | null;
  archived: boolean;
  created: string;
  projectId: string | null;
  timeOfDay: string | null; // "HH:MM:SS" or null = all-day
  durationMinutes: number | null;
}

export interface RoutineOccurrence {
  id: string;
  routineId: string;
  scheduledDate: string;
  completedAt: string;
  note: string;
  created: string;
}

export interface RoutineDueItem {
  routineId: string;
  scheduledDate: string;
  occurrenceId: string | null;
}

export interface Activity {
  id: string;
  kind: ActivityKind;
  entityId: string | null;
  entityTitle: string;
  projectId: string | null;
  targetProjectId: string | null;
  note: string;
  previousValue: string;
  newValue: string;
  created: string;
}

export interface DashboardData {
  projects: Project[];
  tasks: Task[];
  ideas: Idea[];
  activities: Activity[];
  categories: Category[];
  projectNotes: ProjectNote[];
  routines: Routine[];
  routineOccurrences: RoutineOccurrence[];
  lastBackup: string | null;
}

export type AnalyticsRange =
  | "LAST_7_DAYS"
  | "LAST_30_DAYS"
  | "LAST_90_DAYS"
  | "LAST_365_DAYS"
  | "ALL_TIME";

export interface CadenceStats {
  activeDaysInRange: number;
  totalActivityEvents: number;
}

export interface ActivityPoint {
  day: string;
  updates: number;
  completedTasks: number;
  totalEvents: number;
}

export interface WeekdayBucket {
  weekday: number; // ISO 1=Mon..7=Sun
  count: number;
}

export interface ProjectInteractionRow {
  projectId: string;
  name: string;
  status: ProjectStatus;
  interactions: number;
  deltaVsPrev: number;
}

export interface StatusCount {
  status: ProjectStatus;
  count: number;
}

export interface CategoryRow {
  categoryId: string | null;
  name: string;
  color: string;
  projectCount: number;
  interactions: number;
}

export interface BacklogHealth {
  overdueTasks: number;
  dueSoonTasks: number;
  openTasks: number;
  quickWins: number;
  almostThere: number;
}

export interface SleepingProjectRow {
  projectId: string;
  name: string;
  daysIdle: number;
  bucket: "7-14" | "15-30" | "30+";
}

export interface StaleIdeaRow {
  ideaId: string;
  title: string;
  daysOld: number;
}

export interface IdeaFunnel {
  ideasCreated: number;
  ideasPromoted: number;
  promotionRate: number;
}

export interface EffortProjectRow {
  projectId: string;
  name: string;
  hours: number;
}

export interface EffortStats {
  effortHoursTotal: number;
  tasksWithEffortPct: number;
  effortHoursByProject: EffortProjectRow[];
}

export interface AnalyticsData {
  range: AnalyticsRange;
  rangeStart: string | null;
  rangeEnd: string;
  cadence: CadenceStats;
  activitySeries: ActivityPoint[];
  weekdayHeatmap: WeekdayBucket[];
  topProjects: ProjectInteractionRow[];
  statusCounts: StatusCount[];
  categoryBreakdown: CategoryRow[];
  backlog: BacklogHealth;
  sleepingProjects: SleepingProjectRow[];
  staleIdeas: StaleIdeaRow[];
  ideaFunnel: IdeaFunnel;
  effort: EffortStats;
}

/**
 * Priority values in severity order. Localized labels live in messages
 * under `priority.{value}` and should be resolved via `useTranslations`.
 */
export const PRIORITIES: Priority[] = ["critical", "high", "medium", "low"];

export const priorityRank = (p: Priority): number => {
  const order: Record<Priority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return order[p] ?? 2;
};

export const CATEGORY_COLORS = [
  "emerald",
  "blue",
  "purple",
  "amber",
  "rose",
  "cyan",
  "indigo",
  "pink",
  "lime",
  "orange",
] as const;

// Static map — Tailwind needs the literal class names in source to keep them.
const CATEGORY_COLOR_MAP: Record<string, { chip: string; dot: string }> = {
  emerald: { chip: "bg-accent/15 text-accent border-accent/30", dot: "bg-accent" },
  blue: { chip: "bg-accent-2/15 text-accent-2 border-accent-2/30", dot: "bg-accent-2" },
  purple: { chip: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30", dot: "bg-purple-400" },
  amber: { chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30", dot: "bg-amber-400" },
  rose: { chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30", dot: "bg-rose-400" },
  cyan: { chip: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30", dot: "bg-cyan-400" },
  indigo: { chip: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30", dot: "bg-indigo-400" },
  pink: { chip: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30", dot: "bg-pink-400" },
  lime: { chip: "bg-lime-500/15 text-lime-700 dark:text-lime-300 border-lime-500/30", dot: "bg-lime-400" },
  orange: { chip: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30", dot: "bg-orange-400" },
};

export const categoryColorClass = (color: string) =>
  CATEGORY_COLOR_MAP[color] ?? CATEGORY_COLOR_MAP.emerald;
