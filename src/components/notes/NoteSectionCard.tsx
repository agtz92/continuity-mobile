import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  Check,
  ChevronRight,
  Copy,
  Eye,
  GripVertical,
  Pencil,
  Trash2,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useThemeColors } from "@/theme/useThemeColors";
import { MarkdownText } from "@/components/notes/MarkdownText";
import { deleteFeedback, impactFeedback } from "@/lib/feedback";
import type { NoteSection } from "@/lib/types";

/**
 * One collapsible section (Notion-style toggle) inside a Quick Note. Holds its
 * own draft for heading/body and persists on blur — the parent only sees
 * committed values. Mounted with `key={section.id}` by the editor. Reordered by
 * long-pressing the grip handle (react-native-draggable-flatlist owns the
 * gesture and hands `onDrag`/`isActive` in); a copy button puts the section text
 * on the clipboard.
 */
export function NoteSectionCard({
  section,
  onSave,
  onDelete,
  onDrag,
  isActive,
}: {
  section: NoteSection;
  onSave: (data: { heading: string; body: string; collapsed: boolean }) => void;
  onDelete: () => void;
  onDrag: () => void;
  isActive: boolean;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const [open, setOpen] = useState(!section.collapsed);
  const [editing, setEditing] = useState(!section.body.trim());
  const [heading, setHeading] = useState(section.heading);
  const [body, setBody] = useState(section.body);
  const [copied, setCopied] = useState(false);

  const persist = (next: Partial<{ heading: string; body: string; collapsed: boolean }>) => {
    onSave({ heading, body, collapsed: !open, ...next });
  };

  const toggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    persist({ collapsed: !nextOpen });
  };

  const copy = async () => {
    impactFeedback("light");
    await Clipboard.setStringAsync(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View
      className="overflow-hidden rounded-xl border border-border bg-surface"
      style={
        isActive
          ? {
              shadowColor: c.accent,
              shadowOpacity: 0.3,
              shadowOffset: { width: 0, height: 4 },
              shadowRadius: 12,
              elevation: 8,
            }
          : undefined
      }
    >
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
          onPress={copy}
          hitSlop={6}
          accessibilityLabel={
            copied ? t("views.quickNotes.copied") : t("views.quickNotes.copy")
          }
        >
          {copied ? (
            <Check size={15} color={c.accent} />
          ) : (
            <Copy size={15} color={c.textMuted} />
          )}
        </Pressable>
        <Pressable
          onLongPress={onDrag}
          delayLongPress={150}
          hitSlop={6}
          accessibilityLabel={t("views.quickNotes.drag")}
        >
          <GripVertical size={16} color={c.textMuted} />
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
