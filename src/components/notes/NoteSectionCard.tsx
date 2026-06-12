import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react-native";
import { useThemeColors } from "@/theme/useThemeColors";
import { MarkdownText } from "@/components/notes/MarkdownText";
import { deleteFeedback } from "@/lib/feedback";
import type { NoteSection } from "@/lib/types";

/**
 * One collapsible section (Notion-style toggle) inside a Quick Note. Holds its
 * own draft for heading/body and persists on blur — the parent only sees
 * committed values. Mounted with `key={section.id}` by the editor.
 */
export function NoteSectionCard({
  section,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  section: NoteSection;
  onSave: (data: { heading: string; body: string; collapsed: boolean }) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const [open, setOpen] = useState(!section.collapsed);
  const [editing, setEditing] = useState(!section.body.trim());
  const [heading, setHeading] = useState(section.heading);
  const [body, setBody] = useState(section.body);

  const persist = (next: Partial<{ heading: string; body: string; collapsed: boolean }>) => {
    onSave({ heading, body, collapsed: !open, ...next });
  };

  const toggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    persist({ collapsed: !nextOpen });
  };

  return (
    <View className="overflow-hidden rounded-xl border border-border bg-surface">
      <View className="flex-row items-center gap-2 px-3 py-2.5">
        <Pressable onPress={toggle} hitSlop={8} accessibilityState={{ expanded: open }}>
          <View style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}>
            <ChevronRight size={16} color={c.textMuted} />
          </View>
        </Pressable>
        <TextInput
          value={heading}
          onChangeText={setHeading}
          onBlur={() => persist({})}
          placeholder={t("views.quickNotes.sectionHeading")}
          placeholderTextColor={c.textMuted}
          className="flex-1 py-0 font-semibold"
          style={{ color: c.text, fontSize: 15 }}
        />
        {open ? (
          <Pressable
            onPress={() => setEditing((e) => !e)}
            hitSlop={6}
            accessibilityLabel={
              editing ? t("views.quickNotes.preview") : t("views.quickNotes.edit")
            }
          >
            {editing ? (
              <Eye size={15} color={c.textMuted} />
            ) : (
              <Pencil size={15} color={c.textMuted} />
            )}
          </Pressable>
        ) : null}
        <Pressable
          onPress={onMoveUp}
          disabled={!canMoveUp}
          hitSlop={6}
          style={{ opacity: canMoveUp ? 1 : 0.3 }}
          accessibilityLabel={t("views.quickNotes.moveUp")}
        >
          <ChevronUp size={16} color={c.textMuted} />
        </Pressable>
        <Pressable
          onPress={onMoveDown}
          disabled={!canMoveDown}
          hitSlop={6}
          style={{ opacity: canMoveDown ? 1 : 0.3 }}
          accessibilityLabel={t("views.quickNotes.moveDown")}
        >
          <ChevronDown size={16} color={c.textMuted} />
        </Pressable>
        <Pressable
          onPress={() => {
            deleteFeedback();
            onDelete();
          }}
          hitSlop={6}
          accessibilityLabel={t("views.quickNotes.deleteSection")}
        >
          <Trash2 size={15} color={c.textMuted} />
        </Pressable>
      </View>
      {open && (
        <View className="border-t border-border bg-bg px-3 py-2.5">
          {editing ? (
            <TextInput
              value={body}
              onChangeText={setBody}
              onBlur={() => persist({})}
              placeholder={t("views.quickNotes.sectionBody")}
              placeholderTextColor={c.textMuted}
              multiline
              autoFocus
              className="py-0"
              style={{ color: c.text, fontSize: 15, minHeight: 44, textAlignVertical: "top" }}
            />
          ) : body.trim() ? (
            <Pressable onPress={() => setEditing(true)}>
              <MarkdownText text={body} />
            </Pressable>
          ) : (
            <Pressable onPress={() => setEditing(true)}>
              <Text className="italic" style={{ color: c.textMuted, fontSize: 15 }}>
                {t("views.quickNotes.sectionBody")}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
