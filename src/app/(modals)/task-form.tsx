import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { closeModal } from "@/lib/closeModal";
import { useTranslation } from "react-i18next";
import { Calendar, ListTodo, Lock, User, X } from "lucide-react-native";
import { FormScaffold } from "@/components/ui/FormScaffold";
import { ModalDeleteButton } from "@/components/ui/ModalDeleteButton";
import { Field } from "@/components/ui/Field";
import { FormInput } from "@/components/ui/FormInput";
import { IconAction } from "@/components/ui/IconAction";
import { PresetChips } from "@/components/ui/PresetChips";
import { ProjectSelect } from "@/components/ui/ProjectSelect";
import { BlockerTaskPicker } from "@/components/tasks/BlockerTaskPicker";
import { DatePickerSheet } from "@/components/ui/DatePickerSheet";
import { EffortPresets, useEffortAside } from "@/components/tasks/EffortPresets";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";
import { daysOverdue, todayLocalISODate, toLocalISO } from "@/lib/date";

type DatePreset = "today" | "tomorrow" | "thisWeek";

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

/**
 * Formulario de tarea (2a), rediseño "Breathe": `FormScaffold` + `Field` +
 * `PresetChips`.
 *
 * Params:
 * - `id` — editar una tarea existente.
 * - `projectId` — proyecto preseleccionado al crear.
 * - `title` — título precargado al crear (p. ej. "Continue here" desde el
 *   next step del detalle de proyecto).
 * - `due: "today"` o `due: "YYYY-MM-DD"` — fecha de vencimiento al crear
 *   ("Continue here" del proyecto; "Add to Thursday" del calendario).
 * `title` y `due` solo aplican al crear (sin `id`).
 */
export default function TaskForm() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    projectId?: string;
    title?: string;
    due?: string;
  }>();
  const c = useThemeColors();
  const { tasks, projects } = useDashboardData();
  const { saveTask, deleteTask, addTaskBlocker, removeTaskBlocker } =
    useTaskMutations();

  const existing = params.id ? tasks.find((tk) => tk.id === params.id) : null;
  const creating = !params.id;

  const [title, setTitle] = useState(
    existing?.title ?? (creating && typeof params.title === "string" ? params.title : "")
  );
  const [projectId, setProjectId] = useState<string | null>(
    existing?.projectId ?? params.projectId ?? null
  );
  const [dueDate, setDueDate] = useState(
    existing
      ? isoToInputDate(existing.dueDate)
      : creating && params.due === "today"
        ? todayLocalISODate()
        : creating && params.due && /^\d{4}-\d{2}-\d{2}$/.test(params.due)
          ? params.due
          : ""
  );
  const [effortHours, setEffortHours] = useState(
    existing?.effortHours != null ? String(existing.effortHours) : ""
  );
  const [pickingDate, setPickingDate] = useState(false);
  const [pickingTask, setPickingTask] = useState(false);
  const [addingExternal, setAddingExternal] = useState(false);
  const [externalBlocker, setExternalBlocker] = useState("");
  const [saving, setSaving] = useState(false);

  // Blockers are read live off the dashboard (the add/remove mutations refetch
  // it), so the list reflects the latest server state without local mirroring.
  const blockers = existing?.blockers ?? [];
  const availableBlockerTasks = useMemo(
    () =>
      tasks.filter(
        (tk) =>
          tk.id !== existing?.id &&
          !tk.done &&
          !blockers.some((b) => b.blockingTaskId === tk.id)
      ),
    [tasks, existing?.id, blockers]
  );

  const handleAddTaskBlocker = (blockingTaskId: string) => {
    if (!existing?.id) return;
    void addTaskBlocker({ blockedTaskId: existing.id, blockingTaskId });
  };
  const handleAddExternalBlocker = () => {
    const desc = externalBlocker.trim();
    if (!existing?.id || !desc) return;
    setExternalBlocker("");
    setAddingExternal(false);
    void addTaskBlocker({ blockedTaskId: existing.id, externalDescription: desc });
  };

  const datePresets = useMemo(() => {
    const today = todayLocalISODate();
    return { today, tomorrow: addDays(today, 1), thisWeek: upcomingFridayISO() };
  }, []);
  const activePreset: DatePreset | null =
    dueDate === datePresets.today
      ? "today"
      : dueDate === datePresets.tomorrow
        ? "tomorrow"
        : dueDate === datePresets.thisWeek
          ? "thisWeek"
          : null;
  const customDate = !!dueDate && activePreset === null;
  const togglePreset = (p: DatePreset) =>
    setDueDate((cur) => (cur === datePresets[p] ? "" : datePresets[p]));

  // "Mon, Oct 26 · 3 days late": la fecha actual a la derecha del label.
  const lateDays = dueDate ? daysOverdue(dueDate) : null;
  const dueAside = dueDate
    ? (() => {
        const [y, m, d] = dueDate.split("-").map(Number);
        const label = new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString(
          i18n.language,
          { weekday: "short", month: "short", day: "numeric" }
        );
        return lateDays
          ? `${label} · ${t("modals.task.daysLate", { count: lateDays })}`
          : label;
      })()
    : null;
  const effortAside = useEffortAside(effortHours);

  const canSave = title.trim().length > 0;

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
    if (ok) closeModal(router);
  };

  const handleDelete = async () => {
    if (!existing?.id) return;
    await deleteTask(existing.id);
    closeModal(router);
  };

  const dashedButton = (
    label: string,
    Icon: typeof ListTodo,
    onPress: () => void,
    disabled = false
  ) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className="min-w-0 flex-1 flex-row items-center justify-center rounded-lg active:opacity-70"
      style={{
        minHeight: SIZE.hit,
        paddingHorizontal: 10,
        gap: 8,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: c.line[22],
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Icon size={16} color={c.text3} />
      <Text
        className="font-sans-medium flex-shrink"
        style={{ fontSize: 14, color: c.text2 }}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <FormScaffold
      title={existing ? t("modals.task.editTitle") : t("modals.task.newTitle")}
      onSave={handleSave}
      saveLabel={t("modals.task.save")}
      canSave={canSave}
      saving={saving}
    >
      <Field label={t("modals.task.titleField")}>
        <FormInput value={title} onChangeText={setTitle} autoFocus={!title} />
      </Field>

      <Field label={t("modals.task.project")}>
        <ProjectSelect
          projects={projects}
          value={projectId}
          onChange={setProjectId}
        />
      </Field>

      <Field
        label={t("modals.task.dueDate")}
        aside={dueAside}
        asideTone={lateDays ? "signal" : "muted"}
      >
        <View className="flex-row items-start" style={{ gap: 8 }}>
          <View className="min-w-0 flex-1">
            <PresetChips<DatePreset>
              options={[
                { value: "today", label: t("modals.task.chips.today") },
                { value: "tomorrow", label: t("modals.task.chips.tomorrow") },
                { value: "thisWeek", label: t("modals.task.chips.thisWeek") },
              ]}
              value={activePreset}
              onChange={togglePreset}
            />
          </View>
          <Pressable
            onPress={() => setPickingDate(true)}
            accessibilityRole="button"
            accessibilityLabel={t("modals.task.pickDate")}
            className="items-center justify-center active:opacity-70"
            style={{
              width: SIZE.chip,
              height: SIZE.chip,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: customDate ? c.accent : c.line[18],
              backgroundColor: customDate ? c.accent : c.surface,
            }}
          >
            <Calendar size={18} color={customDate ? c.bg : c.text2} />
          </Pressable>
        </View>
        <DatePickerSheet
          visible={pickingDate}
          value={dueDate}
          onChange={setDueDate}
          onClose={() => setPickingDate(false)}
          title={t("modals.task.dueDate")}
          clearable
        />
      </Field>

      <Field label={t("modals.task.effort")} aside={effortAside}>
        <EffortPresets value={effortHours} onChange={setEffortHours} />
      </Field>

      {existing && (
        <Field label={t("modals.task.blockers")}>
          <View style={{ gap: 8 }}>
            {blockers.map((b) => {
              const found = b.blockingTaskId
                ? tasks.find((tk) => tk.id === b.blockingTaskId)
                : null;
              const proj = found?.projectId
                ? projects.find((p) => p.id === found.projectId)
                : null;
              return (
                <View
                  key={b.id}
                  className="flex-row items-center rounded-lg border border-border bg-surface"
                  style={{ minHeight: SIZE.hit, paddingLeft: 14, paddingVertical: 4, gap: 12 }}
                >
                  <Lock size={18} color={c.text3} />
                  <View className="min-w-0 flex-1" style={{ paddingVertical: 6 }}>
                    <Text className="font-sans" style={{ fontSize: 15, color: c.text }}>
                      {b.blockingTaskId
                        ? found?.title ?? t("modals.task.unknownTask")
                        : b.externalDescription}
                    </Text>
                    {proj ? (
                      <Text
                        className="font-sans-semibold uppercase"
                        numberOfLines={1}
                        style={{ fontSize: 11, letterSpacing: 0.6, color: c.text3, marginTop: 2 }}
                      >
                        {proj.name}
                      </Text>
                    ) : null}
                  </View>
                  <IconAction
                    icon={X}
                    label={t("modals.task.removeBlocker")}
                    onPress={() => void removeTaskBlocker(b.id)}
                  />
                </View>
              );
            })}

            {addingExternal ? (
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <View className="min-w-0 flex-1">
                  <FormInput
                    value={externalBlocker}
                    onChangeText={setExternalBlocker}
                    placeholder={t("modals.task.externalBlockerPlaceholder")}
                    onSubmitEditing={handleAddExternalBlocker}
                    returnKeyType="done"
                    autoFocus
                  />
                </View>
                <Pressable
                  onPress={handleAddExternalBlocker}
                  disabled={!externalBlocker.trim()}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !externalBlocker.trim() }}
                  className="items-center justify-center rounded-lg bg-accent active:opacity-80"
                  style={{
                    height: SIZE.input,
                    paddingHorizontal: 16,
                    opacity: externalBlocker.trim() ? 1 : 0.4,
                  }}
                >
                  <Text className="font-sans-semibold" style={{ fontSize: 15, color: c.bg }}>
                    {t("modals.task.addBlocker")}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View className="flex-row" style={{ gap: 8 }}>
              {dashedButton(
                t("modals.task.addTaskBlocker"),
                ListTodo,
                () => setPickingTask(true),
                availableBlockerTasks.length === 0
              )}
              {dashedButton(t("modals.task.addExternalBlocker"), User, () =>
                setAddingExternal((v) => !v)
              )}
            </View>
          </View>
          <BlockerTaskPicker
            visible={pickingTask}
            onClose={() => setPickingTask(false)}
            tasks={availableBlockerTasks}
            projects={projects}
            onSelect={handleAddTaskBlocker}
          />
        </Field>
      )}

      {existing?.id && (
        <ModalDeleteButton
          label={t("modals.task.deleteButton")}
          confirmTitle={t("modals.task.deleteConfirm")}
          confirmBody={t("modals.task.deleteConfirmBody")}
          onConfirm={handleDelete}
        />
      )}
    </FormScaffold>
  );
}
