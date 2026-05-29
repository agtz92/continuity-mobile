import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

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
    "Summarize my sleeping projects and suggest one small next step for each.",
  lastWeek: "What did I work on in the last 7 days?",
  staleIdeas:
    "Show me stale ideas (older than 30 days) and tell me which look most promising.",
};

export function QuickActionChips({
  onPick,
  disabled,
}: {
  onPick: (prompt: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View className="flex-row flex-wrap gap-1.5 px-4 pb-2">
      {ACTION_KEYS.map((k) => (
        <Pressable
          key={k}
          onPress={() => onPick(PROMPTS[k])}
          disabled={disabled}
          accessibilityRole="button"
          className="rounded-full border border-border px-2.5 py-1 active:bg-surface"
          style={disabled ? { opacity: 0.5 } : undefined}
        >
          <Text className="text-[11px] text-text-muted">
            {t(`assistant.quickActions.${k}`)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
