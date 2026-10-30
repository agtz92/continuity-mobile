import { memo, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { IconAction } from "@/components/ui/IconAction";
import { SheetRow } from "@/components/more/SheetRow";
import { MarkdownText } from "@/components/notes/MarkdownText";
import { impactFeedback } from "@/lib/feedback";
import type { NoteSection } from "@/lib/types";
import { lift } from "@/theme/lift";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

type SectionData = { heading: string; body: string; collapsed: boolean };

/**
 * Una sección plegable de una Quick Note (1c). Cabecera: chevron 20 en caja
 * 36×44 a la izquierda, título 16/600, **copiar** (accent) y **⋯** a 44. Lo
 * demás — editar texto, plegar, mover, borrar — vive bajo ⋯ para que la fila
 * no sea una regleta de cinco iconos de 15 px.
 *
 * Guarda su propio borrador y persiste al perder foco; el estado plegado se
 * guarda por sección en el servidor (`collapsed` vía `onSave`). Reordenar:
 * long-press sobre la cabecera (el `DraggableFlatList` pasa `onDrag`) o
 * "Mover arriba/abajo" desde el menú.
 */
export const NoteSectionCard = memo(function NoteSectionCard({
  section,
  onSave,
  onDelete,
  onDrag,
  isActive,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  section: NoteSection;
  onSave: (data: SectionData) => void;
  /** Recibe el borrador en pantalla para que el padre no confirme una sección vacía. */
  onDelete: (draft: { heading: string; body: string }) => void;
  onDrag: () => void;
  isActive: boolean;
  onMove: (dir: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const [open, setOpen] = useState(!section.collapsed);
  const [editing, setEditing] = useState(!section.body.trim() && !section.heading.trim());
  const [heading, setHeading] = useState(section.heading);
  const [body, setBody] = useState(section.body);
  const [copied, setCopied] = useState(false);
  const [menu, setMenu] = useState(false);
  // Acción elegida en la hoja; corre al terminar de cerrarse (iOS no presenta
  // un Alert mientras el modal se descarta).
  const pending = useRef<(() => void) | null>(null);

  const persist = (next: Partial<SectionData>) => {
    onSave({ heading, body, collapsed: !open, ...next });
  };

  const setOpenPersist = (nextOpen: boolean) => {
    setOpen(nextOpen);
    persist({ collapsed: !nextOpen });
  };

  const copy = async () => {
    impactFeedback("light");
    await Clipboard.setStringAsync(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const choose = (fn: () => void) => {
    pending.current = fn;
    setMenu(false);
  };
  const runPending = () => {
    const fn = pending.current;
    pending.current = null;
    fn?.();
  };

  const title = heading.trim() || t("views.quickNotes.sectionHeading");

  return (
    <View
      className="overflow-hidden rounded-xl"
      style={[
        { backgroundColor: c.surface, borderWidth: 1, borderColor: c.line[14] },
        isActive ? lift("drag", c) : null,
      ]}
    >
      <Pressable
        onPress={() => setOpenPersist(!open)}
        onLongPress={onDrag}
        delayLongPress={250}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        accessibilityHint={t("views.quickNotes.drag")}
        className="flex-row items-center"
        style={{ minHeight: SIZE.hit, paddingLeft: 4, paddingRight: 4 }}
      >
        <View
          className="items-center justify-center"
          style={{ width: 36, height: SIZE.hit }}
        >
          {/* Rotación por style, no por className alternante (regla 4). */}
          <View style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}>
            <ChevronRight size={20} color={c.text3} />
          </View>
        </View>
        {editing ? (
          <TextInput
            value={heading}
            onChangeText={setHeading}
            onBlur={() => persist({})}
            placeholder={t("views.quickNotes.sectionHeading")}
            placeholderTextColor={c.text5}
            className="flex-1 font-sans-semibold"
            style={{ color: c.text, fontSize: 16, paddingVertical: 10 }}
          />
        ) : (
          <Text
            className="flex-1 font-sans-semibold"
            style={{ color: heading.trim() ? c.text : c.text5, fontSize: 16, lineHeight: 21, paddingVertical: 11 }}
          >
            {title}
          </Text>
        )}
        <IconAction
          icon={copied ? Check : Copy}
          tone="accent"
          label={copied ? t("views.quickNotes.copied") : t("views.quickNotes.copy")}
          onPress={() => void copy()}
        />
        <View style={{ width: 4 }} />
        <IconAction
          icon={MoreHorizontal}
          label={t("views.quickNotes.sectionMenu", { title })}
          onPress={() => setMenu(true)}
        />
      </Pressable>

      {open ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: c.line[14],
            paddingTop: 12,
            paddingHorizontal: 16,
            paddingBottom: 14,
          }}
        >
          {editing ? (
            <TextInput
              value={body}
              onChangeText={setBody}
              onBlur={() => persist({})}
              placeholder={t("views.quickNotes.sectionBody")}
              placeholderTextColor={c.text5}
              multiline
              autoFocus={!!section.heading.trim() || !!section.body.trim()}
              style={{ color: c.text, fontSize: 15, lineHeight: 22, minHeight: 44, textAlignVertical: "top", padding: 0 }}
            />
          ) : body.trim() ? (
            <Pressable onPress={() => setEditing(true)} accessibilityRole="button" accessibilityLabel={t("views.quickNotes.editText")}>
              <MarkdownText text={body} />
            </Pressable>
          ) : (
            <Pressable onPress={() => setEditing(true)} accessibilityRole="button">
              <Text className="font-sans" style={{ color: c.text5, fontSize: 15, lineHeight: 22 }}>
                {t("views.quickNotes.sectionBody")}
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}

      <BottomSheet visible={menu} onClose={() => setMenu(false)} onClosed={runPending} title={title}>
        <SheetRow
          icon={Pencil}
          label={editing ? t("views.quickNotes.preview") : t("views.quickNotes.editText")}
          onPress={() =>
            choose(() => {
              if (editing) {
                persist({});
                setEditing(false);
              } else {
                if (!open) setOpenPersist(true);
                setEditing(true);
              }
            })
          }
        />
        <SheetRow
          icon={open ? ChevronsDownUp : ChevronsUpDown}
          label={open ? t("views.quickNotes.collapse") : t("views.quickNotes.expand")}
          onPress={() => choose(() => setOpenPersist(!open))}
        />
        <SheetRow
          icon={ArrowUp}
          label={t("views.quickNotes.moveUp")}
          disabled={!canMoveUp}
          onPress={() => choose(() => onMove(-1))}
        />
        <SheetRow
          icon={ArrowDown}
          label={t("views.quickNotes.moveDown")}
          disabled={!canMoveDown}
          onPress={() => choose(() => onMove(1))}
        />
        <SheetRow
          icon={Trash2}
          tone="signal"
          label={t("views.quickNotes.deleteSection")}
          onPress={() => choose(() => onDelete({ heading, body }))}
        />
      </BottomSheet>
    </View>
  );
});
