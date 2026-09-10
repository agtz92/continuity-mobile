import { useState } from "react";
import { useThemeColors } from "@/theme/useThemeColors";
import { Pressable, Text } from "react-native";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const c = useThemeColors();
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
      title={t("closure.kill.title", { name: projectName })}
      subtitle={t("closure.kill.subtitle")}
      footer={
        <Pressable
          onPress={handleConfirm}
          disabled={!canSave}
          accessibilityRole="button"
          className="items-center rounded-lg py-3"
          style={{
            backgroundColor: canSave ? c.signal : undefined,
          }}
        >
          <Text
            className={
              "text-base font-sans-semibold " + (canSave ? "" : "text-text-muted")
            }
            style={canSave ? { color: c.bg } : undefined}
          >
            {t("closure.kill.confirm")}
          </Text>
        </Pressable>
      }
    >
      <Field label={t("closure.kill.reasonLabel")}>
        <FormInput
          value={reason}
          onChangeText={setReason}
          multiline
          autoFocus
          placeholder={t("closure.kill.reasonPlaceholder")}
        />
      </Field>
      <Field label={t("closure.kill.learningsLabel")}>
        <FormInput
          value={learnings}
          onChangeText={setLearnings}
          multiline
          placeholder={t("closure.kill.learningsPlaceholder")}
        />
      </Field>
      <Field label={t("closure.kill.wouldRestartLabel")}>
        <FormInput
          value={wouldRestart}
          onChangeText={setWouldRestart}
          multiline
          placeholder={t("closure.kill.wouldRestartPlaceholder")}
        />
      </Field>
      <Text className="font-sans text-xs leading-snug text-text-muted">
        {t("closure.kill.why")}
      </Text>
    </ClosureModalShell>
  );
}
