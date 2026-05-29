import { useState, type ReactNode } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { AssistantToolUseBlock } from "@/hooks/useAssistant";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

const MONO = Platform.OS === "ios" ? "Courier" : "monospace";

const READABLE_NAME: Record<string, string> = {
  get_dashboard_summary: "Dashboard summary",
  list_projects: "List projects",
  get_project_detail: "Project detail",
  list_tasks: "List tasks",
  list_ideas: "List ideas",
  list_categories: "List categories",
  get_analytics: "Analytics",
  search: "Search",
};

function ProjectsList({ output }: { output: unknown }) {
  const c = useThemeColors();
  const projects = (output as { projects?: Array<Record<string, unknown>> })
    ?.projects;
  if (!Array.isArray(projects) || projects.length === 0) return null;
  return (
    <View className="mt-2 gap-1.5">
      {projects.slice(0, 8).map((p, i) => (
        <View
          key={(p.id as string) || i}
          className="flex-row items-center justify-between gap-2 rounded border border-border px-2 py-1.5"
          style={{ backgroundColor: alpha(c.surface, 0.6) }}
        >
          <Text className="flex-1 text-xs text-text" numberOfLines={1}>
            {String(p.name || "")}
          </Text>
          <Text className="text-[10px] uppercase text-text-muted">
            {String(p.status || "")}
          </Text>
        </View>
      ))}
    </View>
  );
}

function TasksList({ output }: { output: unknown }) {
  const c = useThemeColors();
  const tasks = (output as { tasks?: Array<Record<string, unknown>> })?.tasks;
  if (!Array.isArray(tasks) || tasks.length === 0) return null;
  return (
    <View className="mt-2 gap-1.5">
      {tasks.slice(0, 8).map((tk, i) => {
        const done = Boolean(tk.done);
        return (
          <View
            key={(tk.id as string) || i}
            className="flex-row items-center gap-2 rounded border border-border px-2 py-1.5"
            style={{ backgroundColor: alpha(c.surface, 0.6) }}
          >
            <View
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: done ? c.textMuted : c.accent }}
            />
            <Text
              className={
                "flex-1 text-xs " +
                (done ? "text-text-muted line-through" : "text-text")
              }
              numberOfLines={1}
            >
              {String(tk.title || "")}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const RICH_RENDERERS: Record<
  string,
  (props: { output: unknown }) => ReactNode
> = {
  list_projects: ProjectsList,
  list_tasks: TasksList,
};

export function ToolCallCard({ block }: { block: AssistantToolUseBlock }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const c = useThemeColors();
  const name = READABLE_NAME[block.name] || block.name;
  const RichRenderer = RICH_RENDERERS[block.name];
  const isLoading = block.output === undefined;
  const hasInput = Object.keys(block.input).length > 0;

  return (
    <View
      className="my-2 overflow-hidden rounded-lg border border-border"
      style={{ backgroundColor: alpha(c.surface, 0.4) }}
    >
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        className="flex-row items-center gap-2 px-3 py-2"
      >
        {open ? (
          <ChevronDown size={12} color={c.textMuted} />
        ) : (
          <ChevronRight size={12} color={c.textMuted} />
        )}
        <Wrench size={12} color={c.textMuted} />
        <Text className="text-xs font-medium text-text-muted">{name}</Text>
        <Text
          className="ml-auto text-[10px]"
          style={{ color: isLoading ? c.accent : c.textMuted }}
        >
          {isLoading ? t("assistant.tools.running") : t("assistant.tools.done")}
        </Text>
      </Pressable>

      {open && (
        <View
          className="border-t border-border px-3 py-2"
          style={{ backgroundColor: alpha(c.bg, 0.4) }}
        >
          {hasInput && (
            <View className="mb-2">
              <Text className="mb-1 text-[10px] uppercase tracking-wider text-text-muted">
                {t("assistant.tools.input")}
              </Text>
              <Text
                className="text-[11px] text-text-muted"
                style={{ fontFamily: MONO }}
              >
                {JSON.stringify(block.input, null, 2)}
              </Text>
            </View>
          )}
          {!isLoading &&
            (RichRenderer ? (
              <RichRenderer output={block.output} />
            ) : (
              <Text
                className="text-[11px] text-text-muted"
                style={{ fontFamily: MONO }}
              >
                {JSON.stringify(block.output, null, 2)}
              </Text>
            ))}
        </View>
      )}
    </View>
  );
}
