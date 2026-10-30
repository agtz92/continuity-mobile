import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { closeModal } from "@/lib/closeModal";
import { useTranslation } from "react-i18next";
import { ChevronRight, Plus } from "lucide-react-native";
import { FormScaffold } from "@/components/ui/FormScaffold";
import { Field } from "@/components/ui/Field";
import { FormInput } from "@/components/ui/FormInput";
import { DateInput } from "@/components/ui/DatePickerSheet";
import { Segmented, type SegmentedOption } from "@/components/ui/Segmented";
import { PresetChips, type PresetOption } from "@/components/ui/PresetChips";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useProjectMutations } from "@/hooks/useProjectMutations";
import { useCategoryMutations } from "@/hooks/useCategoryMutations";
import { SIZE } from "@/theme/tokens";
import { categoryChipColors, useThemeColors } from "@/theme/useThemeColors";
import {
  CATEGORY_COLORS,
  PRIORITIES,
  type Priority,
  type ProjectStatus,
} from "@/lib/types";

// Paused/killed are intentionally NOT selectable here: those transitions
// require closure notes (collected by the Pause/Kill modals behind the status
// pill on the project detail screen) and the backend rejects them without
// notes. Stalled is auto-detected by the backend, so it's shown only when a
// project is already stalled (so editing doesn't silently flip it). Archived
// only makes sense for a project that already exists.
const CREATE_STATUS: ProjectStatus[] = ["idea", "active", "launched"];
const EDIT_STATUS: ProjectStatus[] = ["idea", "active", "launched", "archived"];

/** Sentinela del chip "New" dentro de las categorías. */
const NEW_CATEGORY = "__new";
const NO_CATEGORY = "__none";

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

/** Formulario de proyecto (2b). */
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
  // "More": descripción y fecha. Abierto de entrada si ya traen algo.
  const [moreOpen, setMoreOpen] = useState(
    !!existing?.description || !!existing?.dueDate
  );

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
    if (ok) closeModal(router);
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

  // Include the project's current status even if it's not normally selectable
  // (stalled/paused/killed), so the control reflects reality. The user can
  // still switch to a normal status from here.
  const base = existing ? EDIT_STATUS : CREATE_STATUS;
  const optionValues: ProjectStatus[] = base.includes(status) ? base : [...base, status];
  const statusOptions: SegmentedOption<ProjectStatus>[] = optionValues.map((s) => ({
    value: s,
    label: t(`status.${s}`),
  }));
  // De menos a más, como se lee de izquierda a derecha.
  const priorityOptions: SegmentedOption<Priority>[] = [...PRIORITIES].reverse().map((p) => ({
    value: p,
    label: t(`priority.${p}`),
  }));
  const categoryOptions: PresetOption<string>[] = [
    { value: NO_CATEGORY, label: t("modals.project.noCategory") },
    ...categories.map((cat) => ({
      value: cat.id,
      label: cat.name,
      bar: categoryChipColors(cat.color, c).dot,
    })),
    {
      value: NEW_CATEGORY,
      label: t("common.new"),
      prefix: <Plus size={14} color={c.text3} />,
    },
  ];

  return (
    <FormScaffold
      title={
        existing ? t("modals.project.editTitle") : t("modals.project.newTitle")
      }
      onSave={handleSave}
      saveLabel={existing ? t("modals.project.saveCta") : t("modals.project.createCta")}
      canSave={canSave}
      saving={saving}
    >
      <Field label={t("modals.project.name")}>
        {/* El nombre como titular editable: sin caja, regla inferior de 2 px. */}
        <TextInput
          value={name}
          onChangeText={setName}
          autoFocus={!existing}
          multiline
          blurOnSubmit
          returnKeyType="next"
          placeholder={t("modals.project.namePlaceholder")}
          placeholderTextColor={c.text5}
          accessibilityLabel={t("modals.project.name")}
          className="font-display"
          style={{
            fontSize: 28,
            letterSpacing: -0.8,
            color: c.text,
            paddingVertical: 6,
            paddingHorizontal: 0,
            borderBottomWidth: 2,
            borderBottomColor: c.accent,
          }}
        />
      </Field>
      <Field label={t("modals.project.why")}>
        <FormInput
          value={why}
          onChangeText={setWhy}
          multiline
          placeholder={t("modals.project.whyPlaceholder")}
        />
      </Field>
      <Field label={t("modals.project.nextStep")}>
        <FormInput
          value={nextStep}
          onChangeText={setNextStep}
          placeholder={`→ ${t("modals.project.nextStepPlaceholder")}`}
        />
      </Field>
      <Field label={t("modals.project.status")}>
        <View className="gap-2">
          <Segmented options={statusOptions} value={status} onChange={setStatus} />
          <Text className="font-sans" style={{ fontSize: 13, lineHeight: 18, color: c.text3 }}>
            {t("modals.project.statusHint")}
          </Text>
        </View>
      </Field>
      <Field label={t("modals.project.priority")}>
        <Segmented options={priorityOptions} value={priority} onChange={setPriority} />
      </Field>
      <Field label={t("modals.project.category")}>
        {!creatingCategory ? (
          <PresetChips
            options={categoryOptions}
            value={categoryId ?? NO_CATEGORY}
            onChange={(v) => {
              if (v === NEW_CATEGORY) return setCreatingCategory(true);
              setCategoryId(v === NO_CATEGORY ? null : v);
            }}
          />
        ) : (
          <View className="gap-3 rounded-lg border border-border bg-surface p-3">
            <FormInput
              value={newCatName}
              onChangeText={setNewCatName}
              placeholder={t("modals.project.newCategoryName")}
              autoFocus
            />
            <View className="flex-row flex-wrap gap-1">
              {CATEGORY_COLORS.map((color) => {
                const active = newCatColor === color;
                return (
                  <Pressable
                    key={color}
                    onPress={() => setNewCatColor(color)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={color}
                    className="items-center justify-center"
                    style={{ width: SIZE.hit, height: SIZE.hit }}
                  >
                    <View
                      className="items-center justify-center rounded-full border-2"
                      style={{ width: 30, height: 30, borderColor: active ? c.text : "transparent" }}
                    >
                      <View
                        className="h-5 w-5 rounded-full"
                        style={{ backgroundColor: categoryChipColors(color, c).dot }}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <View className="flex-row gap-2">
              <Pressable
                onPress={handleCreateCategory}
                className="flex-1 items-center justify-center rounded-md bg-accent"
                style={{ height: SIZE.hit }}
              >
                <Text className="font-sans-semibold" style={{ fontSize: 15, color: c.bg }}>
                  {t("modals.project.createCategory")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setCreatingCategory(false);
                  setNewCatName("");
                }}
                className="items-center justify-center rounded-md border border-border bg-surface px-4"
                style={{ height: SIZE.hit }}
              >
                <Text className="font-sans-medium" style={{ fontSize: 15, color: c.text }}>
                  {t("common.cancel")}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </Field>

      <View className="gap-6">
        <Pressable
          onPress={() => setMoreOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: moreOpen }}
          className="flex-row items-center gap-2 active:opacity-60"
          style={{ height: SIZE.hit, borderTopWidth: 1, borderTopColor: c.line[14] }}
        >
          <View style={{ transform: [{ rotate: moreOpen ? "90deg" : "0deg" }] }}>
            <ChevronRight size={18} color={c.text3} />
          </View>
          <Text
            className="font-sans-semibold uppercase"
            style={{ fontSize: 11, letterSpacing: 0.8, color: c.text3 }}
          >
            {t("modals.project.more")}
          </Text>
        </Pressable>
        {moreOpen ? (
          <>
            <Field label={t("modals.project.description")}>
              <FormInput
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder={t("modals.project.descriptionPlaceholder")}
              />
            </Field>
            <Field label={t("modals.task.dueDate")}>
              <DateInput
                value={dueDate}
                onChange={setDueDate}
                title={t("modals.task.dueDate")}
                clearable
              />
            </Field>
          </>
        ) : null}
      </View>
    </FormScaffold>
  );
}
