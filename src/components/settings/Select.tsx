import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

export type SelectOption = { value: string; label: string };

/**
 * A <select>-style control for native: a button showing the current label that
 * opens a bottom sheet of options. Values are strings; callers map numbers.
 */
export function Select({
  value,
  options,
  onChange,
  title,
  disabled = false,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Sheet header title. */
  title: string;
  disabled?: boolean;
}) {
  const c = useThemeColors();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        accessibilityRole="button"
        disabled={disabled}
        className="flex-row items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5"
        style={disabled ? { opacity: 0.4 } : undefined}
      >
        <Text className="text-text">{selected?.label ?? "—"}</Text>
        <ChevronDown size={16} color={c.textMuted} />
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={title}
        initialHeight="half"
      >
        <View className="gap-1">
          {options.map((o) => {
            const active = o.value === value;
            return (
              <Pressable
                key={o.value}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                accessibilityRole="button"
                className="flex-row items-center justify-between rounded-lg px-3 py-3"
                style={
                  active ? { backgroundColor: alpha(c.accent, 0.1) } : undefined
                }
              >
                <Text className={active ? "font-semibold text-text" : "text-text"}>
                  {o.label}
                </Text>
                {active && <Check size={18} color={c.accent} />}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </>
  );
}
