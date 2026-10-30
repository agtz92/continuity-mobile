import { memo } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

const ACTION_KEYS = [
  "priorities",
  "sleeping",
  "lastWeek",
  "staleIdeas",
] as const;

type ActionKey = (typeof ACTION_KEYS)[number];

// English prompts sent to the model (the labels are localized; the prompt the
// model reads stays in English to match the web behavior).
const PROMPTS: Record<ActionKey, string> = {
  priorities:
    "Suggest priorities for this week based on my projects and overdue tasks.",
  sleeping:
    "Summarize my stalled projects and suggest one small next step for each.",
  lastWeek: "What did I work on in the last 7 days?",
  staleIdeas:
    "Show me stale ideas (older than 30 days) and tell me which look most promising.",
};

/** Cinta horizontal de píldoras de 40 px con las consultas de arranque (`llm`). */
export const QuickActionChips = memo(function QuickActionChips({
  onPick,
  disabled,
}: {
  onPick: (prompt: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 10 }}
    >
      {ACTION_KEYS.map((k) => {
        const label = t(`assistant.quickActions.${k}`);
        return (
          <Pressable
            key={k}
            onPress={() => onPick(PROMPTS[k])}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: !!disabled }}
            className="items-center justify-center rounded-full active:opacity-70"
            style={[
              {
                height: SIZE.chip,
                paddingHorizontal: 16,
                borderWidth: 1,
                borderColor: c.line[18],
                backgroundColor: c.surface,
              },
              disabled ? { opacity: 0.5 } : null,
            ]}
          >
            <Text className="font-sans-medium" style={{ fontSize: 14, color: c.text2 }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});
