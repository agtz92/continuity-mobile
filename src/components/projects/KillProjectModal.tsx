import { useState } from "react";
import { Pressable, Text } from "react-native";
import { Field } from "@/components/ui/Field";
import { FormInput } from "@/components/ui/FormInput";
import { ClosureModalShell } from "./ClosureModalShell";

export type KillNotes = {
  killedReason: string;
  killedLearnings: string;
  killedWouldRestart: string;
};

/**
 * Collects the required kill notes (reason + learnings; would-restart optional)
 * before transitioning a project to `killed`. Copy is verbatim English per the
 * State Closure spec.
 */
export function KillProjectModal({
  visible,
  projectName,
  saving,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  projectName: string;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (notes: KillNotes) => void;
}) {
  const [reason, setReason] = useState("");
  const [learnings, setLearnings] = useState("");
  const [wouldRestart, setWouldRestart] = useState("");

  const canSave =
    reason.trim().length > 0 && learnings.trim().length > 0 && !saving;

  const handleConfirm = () => {
    if (!canSave) return;
    onConfirm({
      killedReason: reason.trim(),
      killedLearnings: learnings.trim(),
      killedWouldRestart: wouldRestart.trim(),
    });
  };

  return (
    <ClosureModalShell
      visible={visible}
      onClose={onCancel}
      dismissible={!saving}
      title={`Killing "${projectName}"`}
      subtitle="Killing is a form of finishing. It deserves a closing ritual."
      footer={
        <Pressable
          onPress={handleConfirm}
          disabled={!canSave}
          accessibilityRole="button"
          className="items-center rounded-lg py-3"
          style={{
            backgroundColor: canSave ? "rgb(220,38,38)" : undefined,
          }}
        >
          <Text
            className={
              "text-base font-semibold " + (canSave ? "" : "text-text-muted")
            }
            style={canSave ? { color: "white" } : undefined}
          >
            Kill with intention
          </Text>
        </Pressable>
      }
    >
      <Field label="Why are you killing this?">
        <FormInput
          value={reason}
          onChangeText={setReason}
          multiline
          autoFocus
          placeholder={
            'e.g., "The scope kept growing and I never validated the core assumption."'
          }
        />
      </Field>
      <Field label="What did you learn from it?">
        <FormInput
          value={learnings}
          onChangeText={setLearnings}
          multiline
          placeholder={
            'e.g., "I should have shipped a 1-week MVP before building 5 months of infrastructure."'
          }
        />
      </Field>
      <Field label="Would you start it again with what you know now? (optional)">
        <FormInput
          value={wouldRestart}
          onChangeText={setWouldRestart}
          multiline
          placeholder={
            'e.g., "Yes, but with a much smaller scope and 2 user interviews first."'
          }
        />
      </Field>
      <Text className="text-xs leading-snug text-text-muted">
        We save this in your Project Graveyard. Not a tombstone, a library of
        what didn't work so you don't repeat it.
      </Text>
    </ClosureModalShell>
  );
}
