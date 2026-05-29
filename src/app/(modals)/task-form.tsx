import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ModalScaffold } from "@/components/ui/ModalScaffold";
import { Field } from "@/components/ui/Field";
import { FormInput } from "@/components/ui/FormInput";
import { DateField } from "@/components/ui/DateField";
import { ProjectSelect } from "@/components/ui/ProjectSelect";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { todayLocalISODate, toLocalISO } from "@/lib/date";

const HOUR_PRESETS = [0.25, 0.5, 1, 2, 4] as const;

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + days);
  return toLocalISO(date);
}

function upcomingFridayISO(): string {
  const today = new Date();
  const daysAhead = (5 - today.getDay() + 7) % 7 || 7;
  const target = new Date(today);
  target.setDate(today.getDate() + daysAhead);
  return toLocalISO(target);
}

function isoToInputDate(iso?: string | null): string {
  return iso ? toLocalISO(new Date(iso)) : "";
}
function inputDateToIso(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0).toISOString();
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityState={{ selected: active }}
      className={
        "rounded-lg border px-3 py-1.5 " +
        (active ? "border-accent bg-accent" : "border-border bg-border")
      }
    >
      <Text
        className={
          "text-sm font-medium " + (active ? "text-bg" : "text-text-muted")
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function TaskForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; projectId?: string }>();
  const { tasks, projects } = useDashboardData();
  const { saveTask } = useTaskMutations();

  const existing = params.id ? tasks.find((tk) => tk.id === params.id) : null;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [projectId, setProjectId] = useState<string | null>(
    existing?.projectId ?? params.projectId ?? null
  );
  const [dueDate, setDueDate] = useState(isoToInputDate(existing?.dueDate));
  const [effortHours, setEffortHours] = useState(
    existing?.effortHours != null ? String(existing.effortHours) : ""
  );
  const [saving, setSaving] = useState(false);

  const datePresets = useMemo(() => {
    const today = todayLocalISODate();
    return { today, tomorrow: addDays(today, 1), friday: upcomingFridayISO() };
  }, []);

  const canSave = title.trim().length > 0;
  const toggleDate = (iso: string) =>
    setDueDate((cur) => (cur === iso ? "" : iso));
  const toggleHour = (h: number) =>
    setEffortHours((cur) => (cur === String(h) ? "" : String(h)));

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const parsed = effortHours.trim() ? parseFloat(effortHours) : NaN;
    const ok = await saveTask({
      id: existing?.id,
      title: title.trim(),
      projectId: projectId || null,
      dueDate: dueDate ? inputDateToIso(dueDate) : null,
      done: existing?.done ?? false,
      effortHours: Number.isFinite(parsed) ? parsed : null,
    });
    setSaving(false);
    if (ok) router.back();
  };

  return (
    <ModalScaffold
      title={existing ? t("modals.task.editTitle") : t("modals.task.newTitle")}
      onSave={handleSave}
      canSave={canSave}
      saving={saving}
    >
      <Field label={t("modals.task.titleField")}>
        <FormInput value={title} onChangeText={setTitle} autoFocus />
      </Field>

      <Field label={t("modals.task.project")}>
        <ProjectSelect
          projects={projects}
          value={projectId}
          onChange={setProjectId}
        />
      </Field>

      <Field label={t("modals.task.dueDate")}>
        <View className="gap-2">
          <View className="flex-row flex-wrap gap-1.5">
            <Chip
              label={t("modals.task.chips.today")}
              active={dueDate === datePresets.today}
              onPress={() => toggleDate(datePresets.today)}
            />
            <Chip
              label={t("modals.task.chips.tomorrow")}
              active={dueDate === datePresets.tomorrow}
              onPress={() => toggleDate(datePresets.tomorrow)}
            />
            <Chip
              label={t("modals.task.chips.thisWeek")}
              active={dueDate === datePresets.friday}
              onPress={() => toggleDate(datePresets.friday)}
            />
            {!!dueDate && (
              <Chip
                label={t("modals.task.chips.clear")}
                active={false}
                onPress={() => setDueDate("")}
              />
            )}
          </View>
          <DateField
            value={dueDate}
            onChange={setDueDate}
            title={t("modals.task.dueDate")}
            clearable
          />
        </View>
      </Field>

      <Field label={t("modals.task.effort")}>
        <View className="gap-2">
          <View className="flex-row flex-wrap gap-1.5">
            {HOUR_PRESETS.map((h) => (
              <Chip
                key={h}
                label={`${h}h`}
                active={effortHours.trim() === String(h)}
                onPress={() => toggleHour(h)}
              />
            ))}
          </View>
          <FormInput
            value={effortHours}
            onChangeText={setEffortHours}
            placeholder={t("modals.task.effortPlaceholder")}
            keyboardType="decimal-pad"
          />
        </View>
      </Field>
    </ModalScaffold>
  );
}
