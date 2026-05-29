import { useState } from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { FormInput } from "@/components/ui/FormInput";
import { PrimaryButton } from "./controls";

/**
 * Step 1 — first name. Pre-filled from the Google OAuth metadata when present
 * (see onboarding.tsx). Validates trimmed non-empty + ≤50 chars, mirroring the
 * web Step1Name, then hands the trimmed value back to the flow.
 */
export function Step1Name({
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
      setError(t("onboarding.step1.errorEmpty"));
      return;
    }
    if (trimmed.length > 50) {
      setError(t("onboarding.step1.errorTooLong"));
      return;
    }
    setError(null);
    onNext(trimmed);
  };

  return (
    <View className="gap-6">
      <View className="gap-2">
        <Text className="text-3xl font-bold text-text">
          {t("onboarding.step1.heading")}
        </Text>
        <Text className="text-base text-text-muted">
          {t("onboarding.step1.sub")}
        </Text>
      </View>

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-text">
          {t("onboarding.step1.label")}
        </Text>
        <FormInput
          value={value}
          onChangeText={(txt) => {
            setValue(txt);
            if (error) setError(null);
          }}
          placeholder={t("onboarding.step1.placeholder")}
          autoFocus
          maxLength={80}
          returnKeyType="next"
          onSubmitEditing={submit}
        />
        {error ? (
          <Text className="text-xs text-red-500">{error}</Text>
        ) : prefilled ? (
          <Text className="text-xs text-text-muted">
            {t("onboarding.step1.helperPrefilled")}
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
