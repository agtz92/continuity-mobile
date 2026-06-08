import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { selectionFeedback } from "@/lib/feedback";

/**
 * Floating Action Button. Absolutely positioned bottom-right. On tab screens the
 * scene already ends at the tab-bar top (the tab bar isn't transparent), so the
 * button only needs a small margin from that edge — no safe-area inset to add.
 * Bump `bottomOffset` for tab-less screens that extend under the home indicator.
 */
export function FAB({
  icon,
  onPress,
  label,
  bottomOffset = 20,
}: {
  icon: ReactNode;
  onPress: () => void;
  /** Accessible label, required for icon-only buttons. */
  label: string;
  bottomOffset?: number;
}) {
  return (
    <Pressable
      onPress={() => {
        selectionFeedback();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="absolute right-4 h-14 w-14 items-center justify-center rounded-full bg-accent shadow-lg active:opacity-90"
      style={{ bottom: bottomOffset }}
    >
      {icon}
    </Pressable>
  );
}
