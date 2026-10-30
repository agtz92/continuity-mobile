import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FormInput } from "@/components/ui/FormInput";
import { useThemeColors } from "@/theme/useThemeColors";
import type { Project, Task } from "@/lib/types";

/**
 * Hoja para elegir otra tarea como bloqueador, **controlada** (`visible` /
 * `onClose`), con búsqueda y agrupado por proyecto. Se abre desde el botón
 * punteado "Another task" del formulario de tarea.
 */
export function BlockerTaskPicker({
  visible,
  onClose,
  tasks,
  projects,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  tasks: Task[];
  projects: Project[];
  onSelect: (taskId: string) => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
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
    // Tasks whose project isn't loaded still surface under "no project".
    const orphan: Task[] = [];
    for (const [key, list] of byProject) {
      if (key === null || projects.some((p) => p.id === key)) continue;
      orphan.push(...list);
    }
    const unassigned = [...(byProject.get(null) ?? []), ...orphan];
    if (unassigned.length) result.push({ id: null, name: null, tasks: unassigned });
    return result;
  }, [tasks, projects, query]);

  const close = () => {
    setQuery("");
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      title={t("modals.task.selectBlockingTask")}
    >
      <View style={{ gap: 12 }}>
        <FormInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("modals.task.searchTaskPlaceholder")}
          autoFocus
          autoCorrect={false}
        />
        {groups.length === 0 ? (
          <Text
            className="font-sans text-center"
            style={{ fontSize: 15, color: c.text3, paddingVertical: 16 }}
          >
            {t("modals.task.noBlockerTasks")}
          </Text>
        ) : (
          groups.map((g) => (
            <View key={g.id ?? "__none__"}>
              <Text
                className="font-sans-semibold uppercase"
                style={{ fontSize: 11, letterSpacing: 0.8, color: c.text3, paddingVertical: 6 }}
              >
                {g.name ?? t("modals.task.noProject")}
              </Text>
              {g.tasks.map((tk) => (
                <Pressable
                  key={tk.id}
                  onPress={() => {
                    onSelect(tk.id);
                    close();
                  }}
                  accessibilityRole="button"
                  className="justify-center active:opacity-60"
                  style={{
                    minHeight: 48,
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: c.line[14],
                  }}
                >
                  <Text className="font-sans" style={{ fontSize: 16, color: c.text }}>
                    {tk.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))
        )}
      </View>
    </BottomSheet>
  );
}
