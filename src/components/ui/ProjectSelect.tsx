import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown } from "lucide-react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Dropdown-style project picker. Renders an input-like trigger that opens a
 * bottom sheet listing "No project" plus every project, each selectable with a
 * check on the active row. Used by the task and routine forms.
 */
export function ProjectSelect({
  projects,
  value,
  onChange,
}: {
  projects: { id: string; name: string }[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const [open, setOpen] = useState(false);

  const selected = value ? projects.find((p) => p.id === value) : null;
  const select = (id: string | null) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        className="flex-row items-center justify-between rounded-lg border border-border bg-border px-3 py-2.5"
      >
        <Text className={selected ? "text-text" : "text-text-muted"}>
          {selected ? selected.name : t("modals.task.noProject")}
        </Text>
        <ChevronDown size={18} color={c.textMuted} />
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={t("modals.task.project")}
      >
        <View className="gap-1">
          <Pressable
            onPress={() => select(null)}
            className="flex-row items-center justify-between rounded-lg px-3 py-3"
          >
            <Text className={!value ? "text-accent" : "text-text"}>
              {t("modals.task.noProject")}
            </Text>
            {!value && <Check size={18} color={c.accent} />}
          </Pressable>
          {projects.map((p) => {
            const active = value === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => select(p.id)}
                className="flex-row items-center justify-between rounded-lg px-3 py-3"
              >
                <Text className={active ? "text-accent" : "text-text"}>
                  {p.name}
                </Text>
                {active && <Check size={18} color={c.accent} />}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </>
  );
}
