import { useState, type ReactNode } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { AssistantToolUseBlock } from "@/hooks/useAssistant";
import { SIZE } from "@/theme/tokens";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

const MONO = Platform.OS === "ios" ? "Courier" : "monospace";

/** Human name of a tool, for the card and the "writing…" line. */
export function toolLabel(name: string): string {
  return READABLE_NAME[name] || name;
}

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
          className="flex-row items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5"
          style={{ backgroundColor: alpha(c.surface, 0.6) }}
        >
          <Text className="font-sans flex-1 text-xs text-text" numberOfLines={1}>
            {String(p.name || "")}
          </Text>
          <Text className="font-sans text-[10px] uppercase text-text-muted">
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
            className="flex-row items-center gap-2 rounded-md border border-border px-2 py-1.5"
            style={{ backgroundColor: alpha(c.surface, 0.6) }}
          >
            <View
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: done ? c.textMuted : c.accent }}
            />
            <Text
              className={"font-sans " + 
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

  // Fila con espina gris, no tarjeta: es un rastro de lo que Loop consultó,
  // no contenido que compita con la respuesta.
  return (
    <View
      className="my-1"
      style={{ borderLeftWidth: 3, borderLeftColor: c.line[22], paddingLeft: 12 }}
    >
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${name}, ${isLoading ? t("assistant.tools.running") : t("assistant.tools.done")}`}
        className="flex-row items-center active:opacity-60"
        style={{ minHeight: SIZE.hit, gap: 8 }}
      >
        <Wrench size={14} color={c.text3} />
        <Text className="font-sans-medium flex-1" style={{ fontSize: 14, color: c.text2 }}>
          {name}
        </Text>
        <Text
          className="font-sans"
          style={{ fontSize: 12, color: isLoading ? c.accent : c.text3 }}
        >
          {isLoading ? t("assistant.tools.running") : t("assistant.tools.done")}
        </Text>
        {open ? (
          <ChevronDown size={16} color={c.text3} />
        ) : (
          <ChevronRight size={16} color={c.text3} />
        )}
      </Pressable>

      {open && (
        <View
          className="rounded-md px-3 py-2"
          style={{ backgroundColor: alpha(c.surface, 0.6), marginBottom: 6 }}
        >
          {hasInput && (
            <View className="mb-2">
              <Text className="font-sans mb-1 text-[10px] uppercase tracking-wider text-text-muted">
                {t("assistant.tools.input")}
              </Text>
              <Text
                className="font-sans text-[11px] text-text-muted"
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
                className="font-sans text-[11px] text-text-muted"
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
