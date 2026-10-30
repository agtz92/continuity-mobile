import { useState } from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { FormInput } from "@/components/ui/FormInput";
import { Field } from "@/components/ui/Field";
import { useThemeColors } from "@/theme/useThemeColors";
import { PrimaryButton, StepHeading, StepLayout } from "./controls";

/**
 * Paso 2 — first name. Pre-filled from the Google OAuth metadata when present
 * (see onboarding.tsx). Validates trimmed non-empty + ≤50 chars, mirroring the
 * web StepName, then hands the trimmed value back to the flow.
 */
export function StepName({
  initialName,
  prefilled,
  busy,
  onNext,
}: {
  initialName: string;
  prefilled: boolean;
  busy: boolean;
  onNext: (name: string) => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const [value, setValue] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError(t("onboarding.name.errorEmpty"));
      return;
    }
    if (trimmed.length > 50) {
      setError(t("onboarding.name.errorTooLong"));
      return;
    }
    setError(null);
    onNext(trimmed);
  };

  return (
    <StepLayout footer={<PrimaryButton label={t("onboarding.next")} onPress={submit} busy={busy} />}>
      <StepHeading title={t("onboarding.name.heading")} sub={t("onboarding.name.sub")} />

      <Field label={t("onboarding.name.label")}>
        <FormInput
          value={value}
          onChangeText={(txt) => {
            setValue(txt);
            if (error) setError(null);
          }}
          placeholder={t("onboarding.name.placeholder")}
          accessibilityLabel={t("onboarding.name.label")}
          autoFocus
          maxLength={80}
          returnKeyType="next"
          onSubmitEditing={submit}
        />
        {error ? (
          <Text className="font-sans" style={{ fontSize: 14, color: c.signal }}>
            {error}
          </Text>
        ) : prefilled ? (
          <Text className="font-sans" style={{ fontSize: 14, color: c.text3 }}>
            {t("onboarding.name.helperPrefilled")}
          </Text>
        ) : null}
      </Field>
    </StepLayout>
  );
}
