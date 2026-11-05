import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FormInput } from "@/components/ui/FormInput";
import { useProjectNoteMutations } from "@/hooks/useProjectNoteMutations";
import { toast } from "@/lib/toast";
import type { ProjectNote } from "@/lib/types";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * "New note" del detalle de proyecto: título opcional + cuerpo (Markdown, como
 * en la web). Misma hoja que `ProjectUpdateSheet`, con un campo más; guarda con
 * `useProjectNoteMutations().create` y la nota aparece en "Notes". Con `note`
 * la misma hoja abre una nota existente para leerla y editarla (`update`).
 */
export function ProjectNoteSheet({
  visible,
  projectId,
  note,
  onClose,
}: {
  visible: boolean;
  projectId: string;
  /** Nota a editar; sin ella la hoja crea una nueva. */
  note?: ProjectNote | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const { create, update } = useProjectNoteMutations();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  // Cada vez que se abre, siembra con la nota elegida (o vacía para crear).
  useEffect(() => {
    if (!visible) return;
    setTitle(note?.title ?? "");
    setBody(note?.body ?? "");
  }, [visible, note?.id]);
  const [busy, setBusy] = useState(false);
  const ready = body.trim().length > 0 && !busy;

  const save = async () => {
    if (!ready) return;
    setBusy(true);
    const data = { projectId, title: title.trim(), body: body.trim() };
    const ok = note ? await update({ id: note.id, ...data }) : await create(data);
    setBusy(false);
    if (ok) {
      toast.success(t("capture.saved.note"), 2000);
      setTitle("");
      setBody("");
      onClose();
    } else {
      toast.error(t("capture.failed"));
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={note ? t("common.edit") : t("notes.newNote")}
      footer={
        <Pressable
          onPress={save}
          disabled={!ready}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
          className="items-center justify-center active:opacity-80"
          style={{
            height: SIZE.button,
            borderRadius: 8,
            backgroundColor: c.accent,
            opacity: ready ? 1 : 0.4,
          }}
        >
          <Text className="font-sans-semibold" style={{ fontSize: 16, color: c.bg }}>
            {t("capture.save")}
          </Text>
        </Pressable>
      }
    >
      <View style={{ gap: 12 }}>
        <FormInput
          value={title}
          onChangeText={setTitle}
          autoFocus={!note}
          placeholder={t("notes.titlePlaceholder")}
          accessibilityLabel={t("notes.titlePlaceholder")}
        />
        <FormInput
          value={body}
          onChangeText={setBody}
          multiline
          placeholder={t("notes.bodyPlaceholder")}
          accessibilityLabel={t("notes.newNote")}
        />
      </View>
    </BottomSheet>
  );
}
