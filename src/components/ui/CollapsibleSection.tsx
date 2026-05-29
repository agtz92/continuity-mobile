import type { ReactNode } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  Text,
  UIManager,
  View,
} from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { THEME_SURFACES } from "@/theme/tokens";

// Required for LayoutAnimation on old-architecture Android; no-op elsewhere.
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function CollapsibleSection({
  open,
  onToggle,
  icon,
  title,
  rightSlot,
  children,
  variant = "h2",
}: {
  open: boolean;
  onToggle: () => void;
  icon?: ReactNode;
  title: ReactNode;
  rightSlot?: ReactNode;
  children: ReactNode;
  /** "h2" mirrors a dashboard section header; "card" wraps in a bordered box. */
  variant?: "h2" | "card";
}) {
  const { effective } = useTheme();
  const s = THEME_SURFACES[effective];

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  // Rotate via inline style, not a toggling className: a className that flips
  // between undefined and a value makes NativeWind's css-interop try to "upgrade"
  // an already-mounted component, whose warning path crashes in Expo Go.
  const chevron = (
    <View style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}>
      <ChevronRight color={s.textMuted} size={16} />
    </View>
  );

  if (variant === "card") {
    return (
      <View className="overflow-hidden rounded-xl border border-border">
        <Pressable
          onPress={toggle}
          accessibilityState={{ expanded: open }}
          className="flex-row items-center gap-2 bg-surface px-3 py-2.5"
        >
          {chevron}
          {icon}
          <Text className="flex-1 text-sm font-medium text-text">{title}</Text>
          {rightSlot}
        </Pressable>
        {open && (
          <View className="border-t border-border bg-bg p-3">{children}</View>
        )}
      </View>
    );
  }

  return (
    <View>
      <Pressable
        onPress={toggle}
        accessibilityState={{ expanded: open }}
        className="-mx-1 mb-3 flex-row flex-wrap items-center gap-2 rounded-md px-1 py-1"
      >
        {chevron}
        {icon}
        <Text className="text-lg font-semibold text-text">{title}</Text>
        {rightSlot}
      </Pressable>
      {open && children}
    </View>
  );
}
