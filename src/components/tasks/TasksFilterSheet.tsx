import { useEffect, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { Project } from "@/lib/types";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useThemeColors } from "@/theme/useThemeColors";

export type TaskFilterDraft = {
  /** Project IDs to include; `null` element represents "no project". Empty set = no filter. */
  projectIds: ReadonlySet<string | null>;
  showCompleted: boolean;
  showBlocked: boolean;
};

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
          className="rounded-lg bg-accent px-4 py-2.5"
          style={{ opacity: count === 0 ? 0.5 : 1 }}
        >
          <Text className="text-center text-sm font-medium text-bg">
            {count === 0
              ? t("views.tasks.filterSheet.applyEmpty")
              : t("views.tasks.filterSheet.apply", { count })}
          </Text>
        </Pressable>
      }
    >
      <View className="mb-2 flex-row justify-end">
        <Pressable onPress={() => setDraft(EMPTY_TASK_FILTER)} hitSlop={6}>
          <Text className="px-2 py-1 text-xs text-accent">
            {t("views.tasks.filterSheet.clear")}
          </Text>
        </Pressable>
      </View>

      <View className="gap-4">
        {(projects.length > 0 || hasUnassigned) && (
          <View>
            <Text className="mb-2 text-[11px] uppercase tracking-wider text-text-muted">
              {t("views.tasks.filterSheet.byProject")}
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {hasUnassigned && (
                <ProjectChip
                  active={draft.projectIds.has(null)}
                  label={t("views.tasks.filterSheet.noProject")}
                  onPress={() => toggleProject(null)}
                />
              )}
              {projects.map((p) => (
                <ProjectChip
                  key={p.id}
                  active={draft.projectIds.has(p.id)}
                  label={p.name}
                  onPress={() => toggleProject(p.id)}
                />
              ))}
            </View>
          </View>
        )}

        <View className="flex-row items-center justify-between px-1 py-2">
          <Text className="text-sm text-text">
            {t("views.tasks.filterSheet.showCompleted")}
          </Text>
          <Switch
            value={draft.showCompleted}
            onValueChange={(v) => setDraft((d) => ({ ...d, showCompleted: v }))}
            trackColor={{ true: c.accent, false: c.border }}
          />
        </View>
        <View className="flex-row items-center justify-between px-1 py-2">
          <Text className="text-sm text-text">
            {t("views.tasks.filterSheet.showBlocked")}
          </Text>
          <Switch
            value={draft.showBlocked}
            onValueChange={(v) => setDraft((d) => ({ ...d, showBlocked: v }))}
            trackColor={{ true: c.accent, false: c.border }}
          />
        </View>
      </View>
    </BottomSheet>
  );
}

function ProjectChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
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
