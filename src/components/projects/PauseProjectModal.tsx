import { useState } from "react";
import { Pressable, Text } from "react-native";
import { Field } from "@/components/ui/Field";
import { FormInput } from "@/components/ui/FormInput";
import { ClosureModalShell } from "./ClosureModalShell";

export type PauseNotes = {
  pausedContext: string;
  pausedNextAction: string;
  pausedBlocker: string;
};

/**
 * Collects the required pause notes (context + next action; blocker optional)
 * before transitioning a project to `paused`. Copy is verbatim English per the
 * State Closure spec. Closing reverts to the previous status (the caller does
 * not persist on cancel).
 */
export function PauseProjectModal({
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
  onConfirm: (notes: PauseNotes) => void;
}) {
  const [context, setContext] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [blocker, setBlocker] = useState("");

  const canSave =
    context.trim().length > 0 && nextAction.trim().length > 0 && !saving;

  const handleConfirm = () => {
    if (!canSave) return;
    onConfirm({
      pausedContext: context.trim(),
      pausedNextAction: nextAction.trim(),
      pausedBlocker: blocker.trim(),
    });
  };

  return (
    <ClosureModalShell
      visible={visible}
      onClose={onCancel}
      dismissible={!saving}
      title={`Pausing "${projectName}"`}
      subtitle="Before you pause this, write something for the version of you who will come back to it. Three quick prompts. Two minutes total."
      footer={
        <Pressable
          onPress={handleConfirm}
          disabled={!canSave}
          accessibilityRole="button"
          className={
            "items-center rounded-lg py-3 " + (canSave ? "bg-accent" : "bg-border")
          }
        >
          <Text
            className={
              "text-base font-semibold " +
              (canSave ? "text-bg" : "text-text-muted")
            }
          >
            Pause project
          </Text>
        </Pressable>
      }
    >
      <Field label="Where exactly are you stopping?">
        <FormInput
          value={context}
          onChangeText={setContext}
          multiline
          autoFocus
          placeholder={'e.g., "Finished hero section. Stuck on pricing logic."'}
        />
      </Field>
      <Field label="What's the very next action when you return?">
        <FormInput
          value={nextAction}
          onChangeText={setNextAction}
          multiline
          placeholder={'e.g., "Write the pricing comparison table copy."'}
        />
      </Field>
      <Field label="What's blocking you right now? (optional)">
        <FormInput
          value={blocker}
          onChangeText={setBlocker}
          multiline
          placeholder={
            'e.g., "Need to talk to 2 users before deciding on pricing strategy."'
          }
        />
      </Field>
      <Text className="text-xs leading-snug text-text-muted">
        Why we ask: Future you will not remember this. Past you owes future you a
        note.
      </Text>
    </ClosureModalShell>
  );
}
