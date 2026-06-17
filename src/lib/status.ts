import {
  Activity,
  AlertCircle,
  Archive,
  Lightbulb,
  Pause,
  Rocket,
  Skull,
  Zap,
} from "lucide-react-native";
import type { ProjectStatus } from "@/lib/types";

/**
 * Status icons + Tailwind tones. Labels are NOT included here because they're
 * locale-dependent — components should resolve them via
 * `useTranslations("status")(status)`.
 */
// Status is a semantic state indicator — colors stay fixed across themes
// and palettes. Each status has a Lucide icon used for the icon-only
// badge on project cards.
export const statusConfig: Record<
  ProjectStatus,
  { color: string; icon: React.ComponentType<{ size?: number }> }
> = {
  idea: {
    color: "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30",
    icon: Lightbulb,
  },
  active: {
    color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    icon: Zap,
  },
  stalled: {
    color: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30",
    icon: AlertCircle,
  },
  paused: {
    color: "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30",
    icon: Pause,
  },
  launched: {
    color: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
    icon: Rocket,
  },
  killed: {
    color: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30",
    icon: Skull,
  },
  archived: {
    color: "bg-text-muted/20 text-text-muted border-text-muted/30",
    icon: Archive,
  },
};

// Status border colors are intentionally fixed Tailwind shades (not theme/
// palette tokens). These are semantic state indicators — they shouldn't
// shift hue when the user picks Pink or Neon. emerald/blue/purple/amber/
// slate all read fine on both dark and light backgrounds at 60% opacity.
export const statusBorderClass: Record<ProjectStatus, string> = {
  active: "border-l-emerald-500/60",
  idea: "border-l-purple-500/60",
  stalled: "border-l-amber-500/60",
  paused: "border-l-slate-500/60",
  launched: "border-l-blue-500/60",
  killed: "border-l-red-500/60",
  archived: "border-l-text-muted",
};

export const STATUS_FILTER_ORDER: Array<"all" | ProjectStatus> = [
  "all",
  "active",
  "stalled",
  "idea",
  "paused",
  "launched",
  "killed",
  "archived",
];

export const fallbackStatusIcon = Activity;
