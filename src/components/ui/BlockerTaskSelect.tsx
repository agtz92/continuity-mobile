import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FormInput } from "@/components/ui/FormInput";
import { useThemeColors } from "@/theme/useThemeColors";
import type { Project, Task } from "@/lib/types";

/**
 * Picker for choosing another task as a blocker. Renders an input-like trigger
 * that opens a bottom sheet with a search box + the candidate tasks grouped by
 * project. Tapping a task adds it immediately (no separate confirm). Faithful to
 * the web `BlockerTaskCombobox`; the candidate list is already filtered by the
 * caller (excludes self, done tasks and tasks already set as blockers).
 */
export function BlockerTaskSelect({
  tasks,
  projects,
  onSelect,
}: {
  tasks: Task[];
  projects: Project[];
  onSelect: (taskId: string) => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? tasks.filter((tk) => tk.title.toLowerCase().includes(q))
      : tasks;
    const byProject = new Map<string | null, Task[]>();
    for (const tk of matched) {
      const key = tk.projectId ?? null;
      if (!byProject.has(key)) byProject.set(key, []);
      byProject.get(key)!.push(tk);
    }
    const result: { id: string | null; name: string | null; tasks: Task[] }[] = [];
    for (const p of projects) {
      const pTasks = byProject.get(p.id);
      if (pTasks?.length) result.push({ id: p.id, name: p.name, tasks: pTasks });
    }
    // Tasks whose project isn't in the loaded list still surface under "no project"
    // so they're never silently dropped.
    const orphan: Task[] = [];
    for (const [key, list] of byProject) {
      if (key === null || projects.some((p) => p.id === key)) continue;
      orphan.push(...list);
    }
    const unassigned = [...(byProject.get(null) ?? []), ...orphan];
    if (unassigned.length)
      result.push({ id: null, name: null, tasks: unassigned });
    return result;
  }, [tasks, projects, query]);

  const select = (taskId: string) => {
    onSelect(taskId);
    setQuery("");
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        className="flex-row items-center justify-between rounded-lg border border-border bg-border px-3 py-2.5"
      >
        <Text className="flex-1 text-base text-text-muted" numberOfLines={1}>
          {t("modals.task.selectBlockingTask")}
        </Text>
        <ChevronDown size={18} color={c.textMuted} />
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => {
          setQuery("");
          setOpen(false);
        }}
        title={t("modals.task.selectBlockingTask")}
      >
        <View className="gap-3">
          <FormInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("modals.task.searchTaskPlaceholder")}
            autoFocus
            autoCorrect={false}
          />
          {groups.length === 0 ? (
            <Text className="px-3 py-4 text-center text-base text-text-muted">
              {t("modals.task.noBlockerTasks")}
            </Text>
          ) : (
            groups.map((g) => (
              <View key={g.id ?? "__none__"} className="gap-1">
                <Text className="px-3 pt-1 text-xs font-medium uppercase tracking-wider text-text-muted">
                  {g.name ?? t("modals.task.noProject")}
                </Text>
                {g.tasks.map((tk) => (
                  <Pressable
                    key={tk.id}
                    onPress={() => select(tk.id)}
                    className="rounded-lg px-3 py-3"
                  >
                    <Text className="text-base text-text" numberOfLines={2}>
                      {tk.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))
          )}
        </View>
      </BottomSheet>
    </>
  );
}
