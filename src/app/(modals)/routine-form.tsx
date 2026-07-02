import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ModalScaffold } from "@/components/ui/ModalScaffold";
import { ModalDeleteButton } from "@/components/ui/ModalDeleteButton";
import { Field } from "@/components/ui/Field";
import { FormInput } from "@/components/ui/FormInput";
import { DateField } from "@/components/ui/DateField";
import { ProjectSelect } from "@/components/ui/ProjectSelect";
import { ChipGroup, type ChipOption } from "@/components/ui/ChipGroup";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useRoutineMutations } from "@/hooks/useRoutineMutations";
import { weekdayShortLabels } from "@/lib/recurrence";
import { todayLocalISODate } from "@/lib/date";
import type { IntervalUnit, RecurrenceType } from "@/lib/types";

const RECURRENCE_TYPES: RecurrenceType[] = [
  "once",
  "weekly_days",
  "every_n",
  "monthly_day",
];
const INTERVAL_UNITS: IntervalUnit[] = ["days", "weeks", "months"];
const EFFORT_PRESETS = [0.25, 0.5, 1, 2] as const;

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

export default function RoutineForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; projectId?: string }>();
  const { routines, projects } = useDashboardData();
  const { saveRoutine, deleteRoutine } = useRoutineMutations();

  const existing = params.id
    ? routines.find((r) => r.id === params.id)
    : null;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(
    existing?.recurrenceType ?? "once"
  );
  const [startDate, setStartDate] = useState(
    existing?.startDate ?? todayLocalISODate()
  );
  const [endDate, setEndDate] = useState(existing?.endDate ?? "");
  const [weekdays, setWeekdays] = useState<number[]>(existing?.weekdays ?? []);
  const [intervalN, setIntervalN] = useState(
    existing?.intervalN != null ? String(existing.intervalN) : "1"
  );
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>(
    existing?.intervalUnit ?? "days"
  );
  const [effortHours, setEffortHours] = useState(
    existing?.effortHours != null ? String(existing.effortHours) : ""
  );
  const [projectId, setProjectId] = useState<string | null>(
    existing?.projectId ?? params.projectId ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleWeekday = (d: number) =>
    setWeekdays((cur) =>
      cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()
    );
  const toggleHour = (h: number) =>
    setEffortHours((cur) => (cur === String(h) ? "" : String(h)));

  const canSave = title.trim().length > 0;

  const handleSave = async () => {
    if (!title.trim()) {
      setError(t("modals.routine.errorTitle"));
      return;
    }
    if (!startDate) {
      setError(t("modals.routine.errorStartDate"));
      return;
    }
    if (recurrenceType === "weekly_days" && weekdays.length === 0) {
      setError(t("modals.routine.errorWeekdays"));
      return;
    }
    let n: number | null = null;
    if (recurrenceType === "every_n") {
      const parsed = parseInt(intervalN, 10);
      if (!Number.isFinite(parsed) || parsed < 1) {
        setError(t("modals.routine.errorIntervalN"));
        return;
      }
      n = parsed;
    }
    let mDay: number | null = null;
    if (recurrenceType === "monthly_day") {
      const [, , dayStr] = startDate.split("-");
      const parsed = parseInt(dayStr ?? "", 10);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 31) {
        setError(t("modals.routine.errorMonthlyDay"));
        return;
      }
      mDay = parsed;
    }
    setError(null);

    const parsedEffort = effortHours.trim() ? parseFloat(effortHours) : NaN;

    setSaving(true);
    const ok = await saveRoutine({
      id: existing?.id,
      title: title.trim(),
      description: description.trim(),
      recurrenceType,
      startDate,
      endDate: recurrenceType === "once" ? null : endDate || null,
      weekdays: recurrenceType === "weekly_days" ? weekdays : [],
      intervalN: recurrenceType === "every_n" ? n : null,
      intervalUnit: recurrenceType === "every_n" ? intervalUnit : null,
      monthlyDay: recurrenceType === "monthly_day" ? mDay : null,
      effortHours: Number.isFinite(parsedEffort) ? parsedEffort : null,
      projectId: projectId || null,
    });
    setSaving(false);
    if (ok) router.back();
  };

  const handleDelete = async () => {
    if (!existing?.id) return;
    await deleteRoutine(existing.id);
    router.back();
  };

  const recurrenceOptions: ChipOption<RecurrenceType>[] = RECURRENCE_TYPES.map(
    (type) => ({
      value: type,
      label:
        type === "once"
          ? t("modals.routine.type.once")
          : type === "weekly_days"
          ? t("modals.routine.type.weeklyDays")
          : type === "every_n"
          ? t("modals.routine.type.everyN")
          : t("modals.routine.type.monthlyDay"),
    })
  );
  const unitOptions: ChipOption<IntervalUnit>[] = INTERVAL_UNITS.map((u) => ({
    value: u,
    label: t(`modals.routine.unit.${u}`),
  }));

  const weekdayLabels = weekdayShortLabels((key) =>
    t(`recurrence.weekday.short.${key}`)
  );
  const monthlyDay = parseInt(startDate.split("-")[2] ?? "1", 10);

  return (
    <ModalScaffold
      title={
        existing ? t("modals.routine.editTitle") : t("modals.routine.newTitle")
      }
      onSave={handleSave}
      canSave={canSave}
      saving={saving}
    >
      <Field label={t("modals.routine.titleField")}>
        <FormInput value={title} onChangeText={setTitle} autoFocus />
      </Field>

      <Field label={t("modals.routine.description")}>
        <FormInput
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder={t("modals.routine.descriptionPlaceholder")}
        />
      </Field>

      {projects.length > 0 && (
        <Field label={t("modals.task.project")}>
          <ProjectSelect
            projects={projects}
            value={projectId}
            onChange={setProjectId}
          />
        </Field>
      )}

      <Field label={t("modals.routine.recurrenceType")}>
        <ChipGroup
          value={recurrenceType}
          options={recurrenceOptions}
          onChange={setRecurrenceType}
        />
      </Field>

      <Field
        label={
          recurrenceType === "once"
            ? t("modals.routine.dateField")
            : t("modals.routine.startDateField")
        }
      >
        <DateField
          value={startDate}
          onChange={setStartDate}
          title={
            recurrenceType === "once"
              ? t("modals.routine.dateField")
              : t("modals.routine.startDateField")
          }
        />
      </Field>

      {recurrenceType === "weekly_days" && (
        <Field label={t("modals.routine.weekdaysField")}>
          <View className="flex-row flex-wrap gap-1.5">
            {weekdayLabels.map((label, idx) => (
              <Pressable
                key={idx}
                onPress={() => toggleWeekday(idx)}
                accessibilityState={{ selected: weekdays.includes(idx) }}
                className={
                  "h-9 w-9 items-center justify-center rounded-lg border " +
                  (weekdays.includes(idx)
                    ? "border-accent bg-accent"
                    : "border-border bg-border")
                }
              >
                <Text
                  className={
                    "text-sm font-medium " +
                    (weekdays.includes(idx) ? "text-bg" : "text-text-muted")
                  }
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Field>
      )}

      {recurrenceType === "every_n" && (
        <Field label={t("modals.routine.intervalField")}>
          <View className="gap-2">
            <FormInput
              value={intervalN}
              onChangeText={setIntervalN}
              keyboardType="number-pad"
            />
            <ChipGroup
              value={intervalUnit}
              options={unitOptions}
              onChange={setIntervalUnit}
            />
          </View>
        </Field>
      )}

      {recurrenceType === "monthly_day" && (
        <View className="rounded-lg border border-border bg-surface px-3 py-2">
          <Text className="text-xs text-text-muted">
            {t("modals.routine.monthlyDayHint", {
              day: Number.isFinite(monthlyDay) ? monthlyDay : 1,
            })}
          </Text>
        </View>
      )}

      {recurrenceType !== "once" && (
        <Field label={t("modals.routine.endDateField")}>
          <DateField
            value={endDate}
            onChange={setEndDate}
            title={t("modals.routine.endDateField")}
            placeholder="YYYY-MM-DD"
            clearable
          />
        </Field>
      )}

      <Field label={t("modals.routine.effort")}>
        <View className="gap-2">
          <View className="flex-row flex-wrap gap-1.5">
            {EFFORT_PRESETS.map((h) => (
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
            placeholder={t("modals.routine.effortPlaceholder")}
            keyboardType="decimal-pad"
          />
        </View>
      </Field>

      {error && (
        <View
          className="rounded-lg border px-3 py-2"
          style={{
            backgroundColor: "rgba(244,63,94,0.1)",
            borderColor: "rgba(244,63,94,0.3)",
          }}
        >
          <Text className="text-sm" style={{ color: "rgb(244,63,94)" }}>
            {error}
          </Text>
        </View>
      )}

      {existing?.id && (
        <ModalDeleteButton
          label={t("modals.routine.deleteButton")}
          confirmTitle={t("modals.routine.deleteConfirm")}
          confirmBody={t("modals.routine.deleteConfirmBody")}
          onConfirm={handleDelete}
        />
      )}
    </ModalScaffold>
  );
}
