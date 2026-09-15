import { useState } from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { FormInput } from "@/components/ui/FormInput";
import { PrimaryButton } from "./controls";

/**
 * Step 1 — first name. Pre-filled from the Google OAuth metadata when present
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
    <View className="gap-6">
      <View className="gap-2">
        <Text className="text-3xl font-sans-bold text-text">
          {t("onboarding.name.heading")}
        </Text>
        <Text className="font-sans text-base text-text-muted">
          {t("onboarding.name.sub")}
        </Text>
      </View>

      <View className="gap-1.5">
        <Text className="text-sm font-sans-medium text-text">
          {t("onboarding.name.label")}
        </Text>
        <FormInput
          value={value}
          onChangeText={(txt) => {
            setValue(txt);
            if (error) setError(null);
          }}
          placeholder={t("onboarding.name.placeholder")}
          autoFocus
          maxLength={80}
          returnKeyType="next"
          onSubmitEditing={submit}
        />
        {error ? (
          <Text className="font-sans text-xs text-signal">{error}</Text>
        ) : prefilled ? (
          <Text className="font-sans text-xs text-text-muted">
            {t("onboarding.name.helperPrefilled")}
          </Text>
        ) : null}
      </View>

      <PrimaryButton
        label={t("onboarding.next")}
        onPress={submit}
        busy={busy}
      />
    </View>
  );
}
