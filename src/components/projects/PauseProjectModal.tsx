import { useState } from "react";
import { Pressable, Text } from "react-native";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      title={t("closure.pause.title", { name: projectName })}
      subtitle={t("closure.pause.subtitle")}
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
            {t("closure.pause.confirm")}
          </Text>
        </Pressable>
      }
    >
      <Field label={t("closure.pause.contextLabel")}>
        <FormInput
          value={context}
          onChangeText={setContext}
          multiline
          autoFocus
          placeholder={t("closure.pause.contextPlaceholder")}
        />
      </Field>
      <Field label={t("closure.pause.nextActionLabel")}>
        <FormInput
          value={nextAction}
          onChangeText={setNextAction}
          multiline
          placeholder={t("closure.pause.nextActionPlaceholder")}
        />
      </Field>
      <Field label={t("closure.pause.blockerLabel")}>
        <FormInput
          value={blocker}
          onChangeText={setBlocker}
          multiline
          placeholder={t("closure.pause.blockerPlaceholder")}
        />
      </Field>
      <Text className="text-xs leading-snug text-text-muted">
        {t("closure.pause.why")}
      </Text>
    </ClosureModalShell>
  );
}
