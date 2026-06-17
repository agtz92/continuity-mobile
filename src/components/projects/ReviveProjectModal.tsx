import { Pressable, Text, View } from "react-native";
import { Lightbulb, Zap } from "lucide-react-native";
import { useThemeColors } from "@/theme/useThemeColors";
import { ClosureModalShell } from "./ClosureModalShell";

/**
 * Revive a killed project back to `active` or `idea`. No notes required; the
 * stored kill notes are kept as history. Copy is verbatim English per spec.
 */
export function ReviveProjectModal({
  visible,
  projectName,
  wouldRestart,
  saving,
  onCancel,
  onRevive,
}: {
  visible: boolean;
  projectName: string;
  wouldRestart?: string;
  saving: boolean;
  onCancel: () => void;
  onRevive: (target: "active" | "idea") => void;
}) {
  const c = useThemeColors();

  return (
    <ClosureModalShell
      visible={visible}
      onClose={onCancel}
      dismissible={!saving}
      title={`Revive "${projectName}"?`}
      subtitle="You killed this once, on purpose. Bringing it back is fine. Just go in with what you learned."
      footer={
        <Pressable
          onPress={onCancel}
          disabled={saving}
          accessibilityRole="button"
          className="items-center rounded-lg border border-border bg-surface py-3"
        >
          <Text className="text-base text-text">Leave it dead</Text>
        </Pressable>
      }
    >
      {!!wouldRestart && (
        <View className="rounded-lg border border-border bg-bg p-3">
          <Text className="mb-1 text-xs uppercase tracking-wider text-text-muted">
            You said you'd restart it like this:
          </Text>
          <Text className="text-sm text-text">{wouldRestart}</Text>
        </View>
      )}
      <Text className="text-sm text-text-muted">Bring it back as:</Text>
      <View className="flex-row gap-2">
        <Pressable
          onPress={() => !saving && onRevive("active")}
          disabled={saving}
          accessibilityRole="button"
          className="flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-accent py-3"
        >
          <Zap size={16} color={c.bg} />
          <Text className="text-base font-semibold text-bg">Active</Text>
        </Pressable>
        <Pressable
          onPress={() => !saving && onRevive("idea")}
          disabled={saving}
          accessibilityRole="button"
          className="flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-border bg-surface py-3"
        >
          <Lightbulb size={16} color={c.text} />
          <Text className="text-base font-semibold text-text">
            Idea (re-validate)
          </Text>
        </Pressable>
      </View>
    </ClosureModalShell>
  );
}
