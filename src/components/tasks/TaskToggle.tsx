import { Pressable, View } from "react-native";
import { Check, Lock, Repeat } from "lucide-react-native";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

const RED_BORDER = "rgba(239,68,68,0.8)"; // red-500 @ 80%

/**
 * Circular completion toggle shared by every task/routine row (mirror of the
 * web `tasks/TaskToggle.tsx`). Replaces the old 18px muted CheckCircle2 icon,
 * which read as decoration rather than a control: an empty 24px ring reads as
 * "fill me in", and the done state fills with the theme accent plus a check.
 *
 * - kind "task": solid ring; turns red while overdue, shows a lock when blocked.
 * - kind "routine": dashed ring with a Repeat glyph ("this one recurs").
 */
export function TaskToggle({
  done,
  overdue = false,
  blocked = false,
  kind = "task",
  onToggle,
  label,
}: {
  done: boolean;
  overdue?: boolean;
  blocked?: boolean;
  kind?: "task" | "routine";
  onToggle: () => void;
  label: string;
}) {
  const c = useThemeColors();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
    >
      <View
        className="items-center justify-center"
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: done
            ? c.accent
            : overdue
              ? RED_BORDER
              : alpha(c.textMuted, 0.6),
          backgroundColor: done ? c.accent : "transparent",
          borderStyle: kind === "routine" && !done ? "dashed" : "solid",
        }}
      >
        {done ? (
          <Check size={14} color={c.bg} strokeWidth={3} />
        ) : blocked ? (
          <Lock size={11} color={c.textMuted} />
        ) : kind === "routine" ? (
          <Repeat size={11} color={c.textMuted} />
        ) : null}
      </View>
    </Pressable>
  );
}
