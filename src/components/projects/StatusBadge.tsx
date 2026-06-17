import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { statusConfig } from "@/lib/status";
import type { ProjectStatus } from "@/lib/types";

/**
 * Colored + icon status badge. Icon component comes from `statusConfig`
 * (src/lib/status.ts, the single source of truth for the icon per status).
 *
 * Tint is a fixed per-status hex (semantic state indicator, theme-independent)
 * passed both to the lucide icon's `color` prop (RN icons don't inherit
 * currentColor from className) and rendered as a translucent fill + border.
 */
const STATUS_TINT: Record<ProjectStatus, string> = {
  idea: "rgb(168,85,247)", // purple
  active: "rgb(16,185,129)", // emerald
  stalled: "rgb(245,158,11)", // amber
  paused: "rgb(100,116,139)", // slate
  launched: "rgb(59,130,246)", // blue
  killed: "rgb(239,68,68)", // red
  archived: "rgb(148,163,184)", // muted slate
};

export function StatusBadge({
  status,
  size = "sm",
}: {
  status: ProjectStatus;
  size?: "sm" | "md";
}) {
  const { t } = useTranslation();
  const Icon = statusConfig[status].icon as React.ComponentType<{
    size?: number;
    color?: string;
  }>;
  const tint = STATUS_TINT[status];
  const iconSize = size === "md" ? 14 : 12;

  return (
    <View
      className="flex-row items-center gap-1.5 self-start rounded-full border px-2.5 py-0.5"
      style={{
        backgroundColor: tint.replace("rgb(", "rgba(").replace(")", ",0.12)"),
        borderColor: tint.replace("rgb(", "rgba(").replace(")", ",0.35)"),
      }}
    >
      <Icon size={iconSize} color={tint} />
      <Text
        className={"font-medium " + (size === "md" ? "text-sm" : "text-xs")}
        style={{ color: tint }}
      >
        {t(`status.${status}`)}
      </Text>
    </View>
  );
}
