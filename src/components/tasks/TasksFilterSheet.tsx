import { useEffect, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { Project } from "@/lib/types";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PresetChips, type PresetOption } from "@/components/ui/PresetChips";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

export type TaskFilterDraft = {
  /** Project IDs to include; `null` element represents "no project". Empty set = no filter. */
  projectIds: ReadonlySet<string | null>;
  showCompleted: boolean;
  showBlocked: boolean;
};

/** Centinela de "sin proyecto" para los chips (los ids reales son UUID). */
const NO_PROJECT = "__none__";

export const EMPTY_TASK_FILTER: TaskFilterDraft = {
  projectIds: new Set(),
  showCompleted: true,
  showBlocked: true,
};

export function TasksFilterSheet({
  visible,
  initial,
  projects,
  hasUnassigned,
  previewCount,
  onApply,
  onClose,
}: {
  visible: boolean;
  initial: TaskFilterDraft;
  projects: Project[];
  hasUnassigned: boolean;
  previewCount: (draft: TaskFilterDraft) => number;
  onApply: (draft: TaskFilterDraft) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const [draft, setDraft] = useState<TaskFilterDraft>(initial);

  useEffect(() => {
    if (visible) setDraft(initial);
  }, [visible, initial]);

  const toggleProject = (id: string | null) => {
    setDraft((d) => {
      const next = new Set(d.projectIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...d, projectIds: next };
    });
  };

  const count = previewCount(draft);

  // `PresetChips` trabaja con strings; el "sin proyecto" (`null`) viaja como
  // centinela y se traduce de vuelta al alternar.
  const projectOptions: PresetOption<string>[] = [
    ...(hasUnassigned
      ? [{ value: NO_PROJECT, label: t("views.tasks.filterSheet.noProject") }]
      : []),
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];
  const selected = [...draft.projectIds].map((id) => id ?? NO_PROJECT);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("views.tasks.filterSheet.title")}
      footer={
        <Pressable
          onPress={() => {
            onApply(draft);
            onClose();
          }}
          disabled={count === 0}
          accessibilityRole="button"
          accessibilityState={{ disabled: count === 0 }}
          className="items-center justify-center active:opacity-80"
          style={{
            height: SIZE.button,
            borderRadius: 8,
            backgroundColor: c.accent,
            opacity: count === 0 ? 0.4 : 1,
          }}
        >
          <Text className="font-sans-semibold" style={{ fontSize: 16, color: c.bg }}>
            {count === 0
              ? t("views.tasks.filterSheet.applyEmpty")
              : t("views.tasks.filterSheet.apply", { count })}
          </Text>
        </Pressable>
      }
    >
      <View className="flex-row justify-end">
        <Pressable
          onPress={() => setDraft(EMPTY_TASK_FILTER)}
          accessibilityRole="button"
          className="items-center justify-center active:opacity-60"
          style={{ height: SIZE.hit, paddingHorizontal: 8 }}
        >
          <Text className="font-sans-medium" style={{ fontSize: 15, color: c.accent }}>
            {t("views.tasks.filterSheet.clear")}
          </Text>
        </Pressable>
      </View>

      <View style={{ gap: SIZE.sectionGap }}>
        {projectOptions.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text
              className="font-sans-semibold uppercase"
              style={{ fontSize: 11, letterSpacing: 0.8, color: c.text3 }}
            >
              {t("views.tasks.filterSheet.byProject")}
            </Text>
            <PresetChips
              options={projectOptions}
              value={selected}
              onChange={(v) => toggleProject(v === NO_PROJECT ? null : v)}
            />
          </View>
        )}

        <View>
          <SwitchRow
            label={t("views.tasks.filterSheet.showCompleted")}
            value={draft.showCompleted}
            onChange={(v) => setDraft((d) => ({ ...d, showCompleted: v }))}
          />
          <SwitchRow
            label={t("views.tasks.filterSheet.showBlocked")}
            value={draft.showBlocked}
            onChange={(v) => setDraft((d) => ({ ...d, showBlocked: v }))}
            last
          />
        </View>
      </View>
    </BottomSheet>
  );
}

function SwitchRow({
  label,
  value,
  onChange,
  last = false,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  const c = useThemeColors();
  return (
    <View
      className="flex-row items-center justify-between"
      style={{
        minHeight: 48,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.line[14],
      }}
    >
      <Text className="font-sans min-w-0 flex-1" style={{ fontSize: 15, color: c.text }}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: c.accent, false: c.line[22] }}
      />
    </View>
  );
}
