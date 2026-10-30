import { useState } from "react";
import { Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { closeModal } from "@/lib/closeModal";
import { useTranslation } from "react-i18next";
import { FormScaffold } from "@/components/ui/FormScaffold";
import { Field } from "@/components/ui/Field";
import { FormInput } from "@/components/ui/FormInput";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useIdeaMutations } from "@/hooks/useIdeaMutations";

export default function IdeaForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { ideas } = useDashboardData();
  const { saveIdea } = useIdeaMutations();

  const existing = id ? ideas.find((i) => i.id === id) : null;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [why, setWhy] = useState(existing?.why ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const ok = await saveIdea({
      id: existing?.id,
      title: title.trim(),
      description,
      why,
    });
    setSaving(false);
    if (ok) closeModal(router);
  };

  return (
    <FormScaffold
      title={existing ? t("modals.idea.editTitle") : t("modals.idea.newTitle")}
      onSave={handleSave}
      saveLabel={existing ? undefined : t("modals.idea.captureCta")}
      canSave={canSave}
      saving={saving}
    >
      {!existing && (
        <Text className="font-sans text-sm text-text-muted">{t("modals.idea.intro")}</Text>
      )}
      <Field label={t("modals.idea.title")}>
        <FormInput value={title} onChangeText={setTitle} autoFocus />
      </Field>
      <Field label={t("modals.idea.why")}>
        <FormInput
          value={why}
          onChangeText={setWhy}
          multiline
          placeholder={t("modals.idea.whyPlaceholder")}
        />
      </Field>
      <Field label={t("modals.idea.notes")}>
        <FormInput value={description} onChangeText={setDescription} multiline />
      </Field>
    </FormScaffold>
  );
}
