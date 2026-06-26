import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Lock, X } from "lucide-react-native";
import { ModalScaffold } from "@/components/ui/ModalScaffold";
import { Field } from "@/components/ui/Field";
import { FormInput } from "@/components/ui/FormInput";
import { DateField } from "@/components/ui/DateField";
import { ProjectSelect } from "@/components/ui/ProjectSelect";
import { BlockerTaskSelect } from "@/components/ui/BlockerTaskSelect";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { useThemeColors } from "@/theme/useThemeColors";
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
  const c = useThemeColors();
  const { tasks, projects } = useDashboardData();
  const { saveTask, addTaskBlocker, removeTaskBlocker } = useTaskMutations();

  const existing = params.id ? tasks.find((tk) => tk.id === params.id) : null;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [projectId, setProjectId] = useState<string | null>(
    existing?.projectId ?? params.projectId ?? null
  );
  const [dueDate, setDueDate] = useState(isoToInputDate(existing?.dueDate));
  const [effortHours, setEffortHours] = useState(
    existing?.effortHours != null ? String(existing.effortHours) : ""
  );
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
    void addTaskBlocker({ blockedTaskId: existing.id, externalDescription: desc });
  };

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

      {existing && (
        <Field label={t("modals.task.blockers")}>
          <View className="gap-2">
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
                  className="flex-row items-center gap-2 rounded-lg bg-border px-3 py-2"
                >
                  <Lock size={13} color={c.textMuted} />
                  <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
                    {b.blockingTaskId ? (
                      <>
                        {proj && (
                          <View className="rounded border border-border bg-surface px-1.5 py-0.5">
                            <Text className="text-[10px] font-medium text-text-muted">
                              {proj.name}
                            </Text>
                          </View>
                        )}
                        <Text
                          className="flex-1 text-sm text-text-muted"
                          numberOfLines={1}
                        >
                          {found?.title ?? t("modals.task.unknownTask")}
                        </Text>
                      </>
                    ) : (
                      <Text
                        className="flex-1 text-sm text-text-muted"
                        numberOfLines={1}
                      >
                        {b.externalDescription}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => void removeTaskBlocker(b.id)}
                    accessibilityLabel={t("common.delete")}
                    hitSlop={8}
                  >
                    <X size={14} color={c.textMuted} />
                  </Pressable>
                </View>
              );
            })}

            {availableBlockerTasks.length > 0 && (
              <BlockerTaskSelect
                tasks={availableBlockerTasks}
                projects={projects}
                onSelect={handleAddTaskBlocker}
              />
            )}

            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <FormInput
                  value={externalBlocker}
                  onChangeText={setExternalBlocker}
                  placeholder={t("modals.task.externalBlockerPlaceholder")}
                  onSubmitEditing={handleAddExternalBlocker}
                  returnKeyType="done"
                />
              </View>
              <Pressable
                onPress={handleAddExternalBlocker}
                disabled={!externalBlocker.trim()}
                className={
                  "rounded-lg border border-border bg-border px-3 py-2.5 " +
                  (externalBlocker.trim() ? "" : "opacity-50")
                }
              >
                <Text className="text-sm text-text">
                  {t("modals.task.addBlocker")}
                </Text>
              </Pressable>
            </View>
          </View>
        </Field>
      )}
    </ModalScaffold>
  );
}
