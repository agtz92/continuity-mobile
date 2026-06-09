import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { FormInput } from "@/components/ui/FormInput";
import { Field } from "@/components/ui/Field";
import { BugTopicSelect } from "@/components/ui/BugTopicSelect";
import { useReportMutations } from "@/hooks/useReportMutations";
import { BUG_TOPIC_VALUES } from "@/lib/bugTopics";
import { toast } from "@/lib/toast";

const MAX_MESSAGE_LEN = 4000;

export default function ReportBug() {
  const { t } = useTranslation();
  const router = useRouter();
  const { submitBugReport } = useReportMutations();

  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const topicOptions = useMemo(
    () => BUG_TOPIC_VALUES.map((v) => t(`bugTopics.${v}`)),
    [t]
  );

  const canSubmit =
    topic.trim().length > 0 && message.trim().length > 0 && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const ok = await submitBugReport({
      topic: topic.trim(),
      message: message.trim(),
    });
    setSubmitting(false);
    if (ok) {
      toast.success(t("reportBug.success"));
      router.back();
    } else {
      toast.error(t("reportBug.error"));
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="gap-5 p-5"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-sm text-text-muted">
        {t("reportBug.description")}
      </Text>

      <Field label={t("reportBug.topicLabel")}>
        <BugTopicSelect
          value={topic}
          onChange={setTopic}
          options={topicOptions}
          placeholder={t("reportBug.topicPlaceholder")}
          sheetTitle={t("reportBug.topicLabel")}
          searchPlaceholder={t("reportBug.searchPlaceholder")}
          freeTextLabel={(q) => t("reportBug.useTyped", { query: q })}
        />
      </Field>

      <Field label={t("reportBug.messageLabel")}>
        <FormInput
          value={message}
          onChangeText={(v) => setMessage(v.slice(0, MAX_MESSAGE_LEN))}
          placeholder={t("reportBug.messagePlaceholder")}
          multiline
          numberOfLines={6}
        />
        <Text className="text-right text-xs text-text-muted">
          {message.length}/{MAX_MESSAGE_LEN}
        </Text>
      </Field>

      <Pressable
        onPress={onSubmit}
        disabled={!canSubmit}
        className="items-center rounded-2xl bg-accent px-4 py-4"
        style={{ opacity: canSubmit ? 1 : 0.5 }}
      >
        <Text className="text-base font-semibold text-white">
          {submitting ? t("reportBug.sending") : t("reportBug.submit")}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
