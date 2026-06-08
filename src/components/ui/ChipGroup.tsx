import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { selectionFeedback } from "@/lib/feedback";

export type ChipOption<V extends string> = {
  value: V;
  label: string;
  /** Optional leading icon/emoji rendered before the label. */
  prefix?: ReactNode;
};

/**
 * Single-select chip group. Stands in for a `<select>` on low-cardinality enums
 * (status, priority, recurrence type) where surfacing the choices directly is
 * faster than opening a picker. Active chip uses the accent; rest sit on border.
 */
export function ChipGroup<V extends string>({
  value,
  options,
  onChange,
}: {
  value: V;
  options: ReadonlyArray<ChipOption<V>>;
  onChange: (next: V) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              selectionFeedback();
              onChange(opt.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            className={
              "flex-row items-center gap-1.5 rounded-lg border px-3 py-1.5 " +
              (active ? "border-accent bg-accent" : "border-border bg-border")
            }
          >
            {opt.prefix}
            <Text
              className={
                "text-sm font-medium " + (active ? "text-bg" : "text-text-muted")
              }
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
