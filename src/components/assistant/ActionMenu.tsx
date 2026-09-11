import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react-native";
import type { CannedGroup } from "@/lib/assistantApi";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

/**
 * The `canned` tier's composer: a menu, not a text box. Mirror of the web
 * `ActionMenu`.
 *
 * The honest shape for a chat with no model behind it. Every button runs a
 * real query and always answers, so nothing here can fail to be understood
 * — which is exactly what a free-text field would promise and not deliver.
 * The one exception is search, which needs a term and says so.
 *
 * Labels come from the server with the catalogue, so a new question ships
 * without an app-store release.
 */
export function ActionMenu({
  groups,
  onRun,
  disabled,
}: {
  groups: CannedGroup[];
  onRun: (actionId: string, label: string, query?: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const [query, setQuery] = useState("");

  const searchAction = groups
    .flatMap((g) => g.actions)
    .find((a) => a.needs_query);

  const canSearch = !disabled && query.trim().length > 0;

  return (
    <View className="border-t border-border">
      <ScrollView
        className="max-h-64"
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}
      >
        <Text className="font-sans text-xs uppercase tracking-wide text-text-muted">
          {t("assistant.actions.hint")}
        </Text>

        {groups
          .filter((g) => g.actions.some((a) => !a.needs_query))
          .map((group) => (
            <View key={group.group} className="gap-2">
              <Text className="font-sans-medium text-xs text-text-muted">
                {group.label}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {group.actions
                  .filter((a) => !a.needs_query)
                  .map((action) => (
                    <Pressable
                      key={action.id}
                      onPress={() => onRun(action.id, action.label)}
                      disabled={disabled}
                      accessibilityRole="button"
                      className="rounded-full border border-border px-3 py-1.5"
                      style={disabled ? { opacity: 0.5 } : undefined}
                    >
                      <Text className="font-sans text-xs text-text">
                        {action.label}
                      </Text>
                    </Pressable>
                  ))}
              </View>
            </View>
          ))}
      </ScrollView>

      {searchAction && (
        <View className="flex-row items-end gap-2 border-t border-border px-4 py-3">
          <View className="flex-1 flex-row items-center gap-2 rounded-xl border border-border bg-surface px-3">
            <Search size={14} color={c.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchAction.placeholder}
              placeholderTextColor={c.textMuted}
              accessibilityLabel={searchAction.label}
              returnKeyType="search"
              onSubmitEditing={() => {
                if (!canSearch) return;
                onRun(
                  searchAction.id,
                  `${searchAction.label}: ${query.trim()}`,
                  query.trim(),
                );
                setQuery("");
              }}
              className="flex-1 py-2.5 text-text"
            />
          </View>
          <Pressable
            onPress={() => {
              if (!canSearch) return;
              onRun(
                searchAction.id,
                `${searchAction.label}: ${query.trim()}`,
                query.trim(),
              );
              setQuery("");
            }}
            disabled={!canSearch}
            accessibilityRole="button"
            accessibilityLabel={searchAction.label}
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: canSearch ? c.accent : alpha(c.text, 0.12) }}
          >
            <Search size={18} color={canSearch ? c.bg : c.textMuted} />
          </Pressable>
        </View>
      )}
    </View>
  );
}
