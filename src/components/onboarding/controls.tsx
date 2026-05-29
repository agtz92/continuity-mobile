import { ActivityIndicator, Pressable, Text } from "react-native";
import { useThemeColors } from "@/theme/useThemeColors";

/** Solid accent CTA used across the onboarding steps. */
export function PrimaryButton({
  label,
  onPress,
  busy = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const c = useThemeColors();
  const off = busy || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      className="flex-row items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3"
      style={off ? { opacity: 0.5 } : undefined}
    >
      {busy && <ActivityIndicator size="small" color={c.bg} />}
      <Text className="font-semibold text-bg">{label}</Text>
    </Pressable>
  );
}

/** Muted text-only button (Back / Skip / secondary actions). */
export function TextButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      hitSlop={8}
      style={disabled ? { opacity: 0.5 } : undefined}
    >
      <Text className="text-sm text-text-muted">{label}</Text>
    </Pressable>
  );
}

/** Pill toggle reused for theme mode + (with swatches) palette selection. */
export function Pill({
  label,
  active,
  onPress,
  leading,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  leading?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className={
        "flex-row items-center gap-2 rounded-full border px-3 py-1.5 " +
        (active ? "border-accent bg-accent" : "border-border bg-surface")
      }
    >
      {leading}
      <Text className={active ? "font-semibold text-bg" : "text-text"}>
        {label}
      </Text>
    </Pressable>
  );
}
