import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react-native";
import { ModalScaffold } from "@/components/ui/ModalScaffold";
import { Field } from "@/components/ui/Field";
import { FormInput } from "@/components/ui/FormInput";
import { DateField } from "@/components/ui/DateField";
import { ChipGroup, type ChipOption } from "@/components/ui/ChipGroup";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useProjectMutations } from "@/hooks/useProjectMutations";
import { useCategoryMutations } from "@/hooks/useCategoryMutations";
import { categoryChipColors, useThemeColors } from "@/theme/useThemeColors";
import {
  CATEGORY_COLORS,
  PRIORITIES,
  type Priority,
  type ProjectStatus,
} from "@/lib/types";

const STATUS_OPTIONS: ProjectStatus[] = [
  "idea",
  "active",
  "paused",
  "launched",
  "archived",
];

function isoToInputDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
function inputDateToIso(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0).toISOString();
}

export default function ProjectForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { projects, categories } = useDashboardData();
  const { saveProject } = useProjectMutations();
  const { createCategory } = useCategoryMutations();

  const existing = id ? projects.find((p) => p.id === id) : null;

  const [name, setName] = useState(existing?.name ?? "");
  const [why, setWhy] = useState(existing?.why ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [nextStep, setNextStep] = useState(existing?.nextStep ?? "");
  const [status, setStatus] = useState<ProjectStatus>(
    (existing?.status as ProjectStatus) ?? "idea"
  );
  const [priority, setPriority] = useState<Priority>(
    existing?.priority ?? "medium"
  );
  const [categoryId, setCategoryId] = useState<string | null>(
    existing?.categoryId ?? null
  );
  const [dueDate, setDueDate] = useState(isoToInputDate(existing?.dueDate));
  const [saving, setSaving] = useState(false);

  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState<string>("emerald");

  const canSave = name.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const ok = await saveProject({
      id: existing?.id,
      name: name.trim(),
      description,
      why,
      nextStep,
      status,
      priority,
      categoryId,
      dueDate: dueDate ? inputDateToIso(dueDate) : null,
    });
    setSaving(false);
    if (ok) router.back();
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    const cat = await createCategory({
      name: newCatName.trim(),
      color: newCatColor,
    });
    if (cat) {
      setCategoryId(cat.id);
      setCreatingCategory(false);
      setNewCatName("");
    }
  };

  const statusOptions: ChipOption<ProjectStatus>[] = STATUS_OPTIONS.map((s) => ({
    value: s,
    label: t(`status.${s}`),
  }));
  const priorityOptions: ChipOption<Priority>[] = PRIORITIES.map((p) => ({
    value: p,
    label: t(`priority.${p}`),
  }));

  return (
    <ModalScaffold
      title={
        existing ? t("modals.project.editTitle") : t("modals.project.newTitle")
      }
      onSave={handleSave}
      canSave={canSave}
      saving={saving}
    >
      <Field label={t("modals.project.name")}>
        <FormInput value={name} onChangeText={setName} autoFocus />
      </Field>
      <Field label={t("modals.project.why")}>
        <FormInput
          value={why}
          onChangeText={setWhy}
          multiline
          placeholder={t("modals.project.whyPlaceholder")}
        />
      </Field>
      <Field label={t("modals.project.description")}>
        <FormInput
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder={t("modals.project.descriptionPlaceholder")}
        />
      </Field>
      <Field label={t("modals.project.nextStep")}>
        <FormInput
          value={nextStep}
          onChangeText={setNextStep}
          placeholder={t("modals.project.nextStepPlaceholder")}
        />
      </Field>
      <Field label={t("modals.project.status")}>
        <ChipGroup value={status} options={statusOptions} onChange={setStatus} />
      </Field>
      <Field label={t("modals.project.priority")}>
        <ChipGroup
          value={priority}
          options={priorityOptions}
          onChange={setPriority}
        />
      </Field>
      <Field label={t("modals.task.dueDate")}>
        <DateField
          value={dueDate}
          onChange={setDueDate}
          title={t("modals.task.dueDate")}
          clearable
        />
      </Field>
      <Field label={t("modals.project.category")}>
        {!creatingCategory ? (
          <View className="gap-2">
            <View className="flex-row flex-wrap gap-1.5">
              <Pressable
                onPress={() => setCategoryId(null)}
                className={
                  "rounded-lg border px-3 py-1.5 " +
                  (categoryId === null
                    ? "border-accent bg-accent"
                    : "border-border bg-border")
                }
              >
                <Text
                  className={
                    "text-sm font-medium " +
                    (categoryId === null ? "text-bg" : "text-text-muted")
                  }
                >
                  {t("modals.project.noCategory")}
                </Text>
              </Pressable>
              {categories.map((cat) => {
                const active = categoryId === cat.id;
                const chip = categoryChipColors(cat.color, c);
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setCategoryId(cat.id)}
                    className="flex-row items-center gap-1.5 rounded-lg border px-3 py-1.5"
                    style={{
                      backgroundColor: active ? chip.bg : c.surface,
                      borderColor: active ? chip.border : c.border,
                    }}
                  >
                    <View
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: chip.dot }}
                    />
                    <Text
                      className="text-sm font-medium"
                      style={{ color: active ? chip.text : c.textMuted }}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setCreatingCategory(true)}
                className="flex-row items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5"
              >
                <Plus size={13} color={c.textMuted} />
                <Text className="text-sm text-text-muted">{t("common.new")}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="gap-2 rounded-lg border border-border bg-surface p-3">
            <FormInput
              value={newCatName}
              onChangeText={setNewCatName}
              placeholder={t("modals.project.newCategoryName")}
              autoFocus
            />
            <View className="flex-row flex-wrap gap-2">
              {CATEGORY_COLORS.map((color) => {
                const chip = categoryChipColors(color, c);
                const active = newCatColor === color;
                return (
                  <Pressable
                    key={color}
                    onPress={() => setNewCatColor(color)}
                    accessibilityLabel={color}
                    className="h-7 w-7 items-center justify-center rounded-full border-2"
                    style={{
                      borderColor: active ? c.text : "transparent",
                    }}
                  >
                    <View
                      className="h-5 w-5 rounded-full"
                      style={{ backgroundColor: chip.dot }}
                    />
                  </Pressable>
                );
              })}
            </View>
            <View className="flex-row gap-2">
              <Pressable
                onPress={handleCreateCategory}
                className="flex-1 items-center rounded-lg bg-accent py-2"
              >
                <Text className="text-sm font-semibold text-bg">
                  {t("modals.project.createCategory")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setCreatingCategory(false);
                  setNewCatName("");
                }}
                className="rounded-lg border border-border bg-border px-4 py-2"
              >
                <Text className="text-sm text-text">{t("common.cancel")}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Field>
    </ModalScaffold>
  );
}
