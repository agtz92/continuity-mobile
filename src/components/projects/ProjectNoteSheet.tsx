import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FormInput } from "@/components/ui/FormInput";
import { useProjectNoteMutations } from "@/hooks/useProjectNoteMutations";
import { toast } from "@/lib/toast";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * "New note" del detalle de proyecto: título opcional + cuerpo (Markdown, como
 * en la web). Misma hoja que `ProjectUpdateSheet`, con un campo más; guarda con
 * `useProjectNoteMutations().create` y la nota aparece en "Notes".
 */
export function ProjectNoteSheet({
  visible,
  projectId,
  onClose,
}: {
  visible: boolean;
  projectId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const { create } = useProjectNoteMutations();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = body.trim().length > 0 && !busy;

  const save = async () => {
    if (!ready) return;
    setBusy(true);
    const ok = await create({ projectId, title: title.trim(), body: body.trim() });
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
      title={t("notes.newNote")}
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
          autoFocus
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
