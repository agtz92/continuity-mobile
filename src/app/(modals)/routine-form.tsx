import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { closeModal } from "@/lib/closeModal";
import { useTranslation } from "react-i18next";
import { FormScaffold } from "@/components/ui/FormScaffold";
import { ModalDeleteButton } from "@/components/ui/ModalDeleteButton";
import { Field } from "@/components/ui/Field";
import { FormInput } from "@/components/ui/FormInput";
import { PresetChips } from "@/components/ui/PresetChips";
import { ProjectSelect } from "@/components/ui/ProjectSelect";
import { Segmented } from "@/components/ui/Segmented";
import { DateInput } from "@/components/ui/DatePickerSheet";
import { EffortPresets, useEffortAside } from "@/components/tasks/EffortPresets";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useRoutineMutations } from "@/hooks/useRoutineMutations";
import { describeRecurrence, weekdayShortLabels } from "@/lib/recurrence";
import { todayLocalISODate } from "@/lib/date";
import type { IntervalUnit, RecurrenceType, Routine } from "@/lib/types";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

const INTERVAL_UNITS: IntervalUnit[] = ["days", "weeks", "months"];
const WEEKDAY_VALUES = ["0", "1", "2", "3", "4", "5", "6"] as const;
type WeekdayValue = (typeof WEEKDAY_VALUES)[number];

/**
 * Formulario de rutina (3f), rediseño "Breathe": segmentado Once / Weekly /
 * Every N / Monthly (→ `recurrenceType` once / weekly_days / every_n /
 * monthly_day), días como 7 celdas de 44, Starts/Ends lado a lado y esfuerzo
 * en presets. El archivado NO vive aquí: se queda en la fila (`RoutineRow`).
 */
export default function RoutineForm() {
  const { t } = useTranslation();
  const c = useThemeColors();
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

  const toggleWeekday = (v: WeekdayValue) => {
    const d = Number(v);
    setWeekdays((cur) =>
      cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()
    );
  };

  const canSave = title.trim().length > 0;
  const monthlyDay = parseInt(startDate.split("-")[2] ?? "1", 10);
  const parsedN = parseInt(intervalN, 10);

  const recLabel = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      t(`recurrence.${key}`, vars),
    [t]
  );
  // El resumen de la regla en borrador ("T · F", "Every 2 weeks") como `aside`.
  const recurrenceAside =
    recurrenceType === "once"
      ? null
      : describeRecurrence(
          {
            ...(existing ?? {}),
            recurrenceType,
            startDate,
            weekdays,
            intervalN: Number.isFinite(parsedN) && parsedN >= 1 ? parsedN : 1,
            intervalUnit,
            monthlyDay: Number.isFinite(monthlyDay) ? monthlyDay : 1,
          } as Routine,
          recLabel
        );
  const effortAside = useEffortAside(effortHours);

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
      if (!Number.isFinite(parsedN) || parsedN < 1) {
        setError(t("modals.routine.errorIntervalN"));
        return;
      }
      n = parsedN;
    }
    let mDay: number | null = null;
    if (recurrenceType === "monthly_day") {
      if (!Number.isFinite(monthlyDay) || monthlyDay < 1 || monthlyDay > 31) {
        setError(t("modals.routine.errorMonthlyDay"));
        return;
      }
      mDay = monthlyDay;
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
    if (ok) closeModal(router);
  };

  const handleDelete = async () => {
    if (!existing?.id) return;
    await deleteRoutine(existing.id);
    closeModal(router);
  };

  const weekdayLabels = weekdayShortLabels((key) =>
    t(`recurrence.weekday.short.${key}`)
  );

  return (
    <FormScaffold
      title={
        existing ? t("modals.routine.editTitle") : t("modals.routine.newTitle")
      }
      onSave={handleSave}
      saveLabel={t("modals.routine.save")}
      canSave={canSave}
      saving={saving}
    >
      <Field label={t("modals.routine.titleField")}>
        <FormInput value={title} onChangeText={setTitle} autoFocus={!title} />
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

      <Field label={t("modals.routine.recurrenceType")} aside={recurrenceAside}>
        <View style={{ gap: 8 }}>
          <Segmented<RecurrenceType>
            options={[
              { value: "once", label: t("modals.routine.segment.once") },
              { value: "weekly_days", label: t("modals.routine.segment.weekly") },
              { value: "every_n", label: t("modals.routine.segment.everyN") },
              { value: "monthly_day", label: t("modals.routine.segment.monthly") },
            ]}
            value={recurrenceType}
            onChange={setRecurrenceType}
          />

          {recurrenceType === "weekly_days" && (
            <PresetChips<WeekdayValue>
              cell={44}
              options={WEEKDAY_VALUES.map((v, idx) => ({
                value: v,
                label: weekdayLabels[idx],
              }))}
              value={weekdays.map((d) => String(d) as WeekdayValue)}
              onChange={toggleWeekday}
            />
          )}

          {recurrenceType === "every_n" && (
            <View className="flex-row items-start" style={{ gap: 8 }}>
              <View style={{ width: 72 }}>
                <FormInput
                  value={intervalN}
                  onChangeText={setIntervalN}
                  keyboardType="number-pad"
                  accessibilityLabel={t("modals.routine.intervalField")}
                  style={{ height: 40, textAlign: "center" }}
                />
              </View>
              <View className="min-w-0 flex-1">
                <PresetChips<IntervalUnit>
                  options={INTERVAL_UNITS.map((u) => ({
                    value: u,
                    label: t(`modals.routine.unit.${u}`),
                  }))}
                  value={intervalUnit}
                  onChange={setIntervalUnit}
                />
              </View>
            </View>
          )}

          {recurrenceType === "monthly_day" && (
            <Text className="font-sans" style={{ fontSize: 14, color: c.text3 }}>
              {t("modals.routine.monthlyDayHint", {
                day: Number.isFinite(monthlyDay) ? monthlyDay : 1,
              })}
            </Text>
          )}
        </View>
      </Field>

      {recurrenceType === "once" ? (
        <Field label={t("modals.routine.dateField")}>
          <DateInput
            value={startDate}
            onChange={setStartDate}
            title={t("modals.routine.dateField")}
          />
        </Field>
      ) : (
        <View className="flex-row" style={{ gap: 12 }}>
          <View className="min-w-0 flex-1">
            <Field label={t("modals.routine.startDateField")}>
              <DateInput
                value={startDate}
                onChange={setStartDate}
                title={t("modals.routine.startDateField")}
              />
            </Field>
          </View>
          <View className="min-w-0 flex-1">
            <Field label={t("modals.routine.endDateField")}>
              <DateInput
                value={endDate}
                onChange={setEndDate}
                title={t("modals.routine.endDateField")}
                placeholder={t("modals.routine.never")}
                clearable
              />
            </Field>
          </View>
        </View>
      )}

      <Field label={t("modals.routine.effort")} aside={effortAside}>
        <EffortPresets value={effortHours} onChange={setEffortHours} />
      </Field>

      <Field label={t("modals.routine.description")}>
        <FormInput
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder={t("modals.routine.descriptionPlaceholder")}
        />
      </Field>

      {error && (
        <View
          className="rounded-lg border px-3 py-2"
          style={{
            backgroundColor: alpha(c.signal, 0.1),
            borderColor: alpha(c.signal, 0.3),
          }}
        >
          <Text className="font-sans" style={{ fontSize: 15, color: c.signal }}>
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
    </FormScaffold>
  );
}
