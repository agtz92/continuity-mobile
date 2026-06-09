import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FormInput } from "@/components/ui/FormInput";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Topic picker for the bug report screen. Opens a bottom sheet with a search
 * box + the common topics; the user can pick a suggestion OR type their own
 * (a "use «typed»" row commits free text). The input IS the topic — there's no
 * forced selection. Faithful to the web autocomplete combobox.
 */
export function BugTopicSelect({
  value,
  onChange,
  options,
  placeholder,
  sheetTitle,
  searchPlaceholder,
  freeTextLabel,
}: {
  value: string;
  onChange: (topic: string) => void;
  /** Localized suggestion labels for the common bug topics. */
  options: string[];
  placeholder: string;
  sheetTitle: string;
  searchPlaceholder: string;
  /** Builds the "use «query»" row label from the typed text. */
  freeTextLabel: (query: string) => string;
}) {
  const c = useThemeColors();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const trimmed = query.trim();
  const showFreeText =
    trimmed.length > 0 &&
    !options.some((o) => o.toLowerCase() === trimmed.toLowerCase());

  const commit = (topic: string) => {
    onChange(topic);
    setQuery("");
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        className="flex-row items-center justify-between rounded-lg border border-border bg-border px-3 py-2.5"
      >
        <Text
          className={"text-base " + (value ? "text-text" : "text-text-muted")}
        >
          {value || placeholder}
        </Text>
        <ChevronDown size={18} color={c.textMuted} />
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => {
          setQuery("");
          setOpen(false);
        }}
        title={sheetTitle}
      >
        <View className="gap-3">
          <FormInput
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            autoFocus
            autoCorrect={false}
          />
          <View className="gap-1">
            {showFreeText && (
              <Pressable
                onPress={() => commit(trimmed)}
                className="flex-row items-center justify-between rounded-lg px-3 py-3"
              >
                <Text className="text-base text-accent">
                  {freeTextLabel(trimmed)}
                </Text>
              </Pressable>
            )}
            {filtered.map((opt) => {
              const active = opt === value;
              return (
                <Pressable
                  key={opt}
                  onPress={() => commit(opt)}
                  className="flex-row items-center justify-between rounded-lg px-3 py-3"
                >
                  <Text
                    className={
                      "text-base " + (active ? "text-accent" : "text-text")
                    }
                  >
                    {opt}
                  </Text>
                  {active && <Check size={18} color={c.accent} />}
                </Pressable>
              );
            })}
          </View>
        </View>
      </BottomSheet>
    </>
  );
}
