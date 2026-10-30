import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FormInput } from "@/components/ui/FormInput";
import { useNoteMutations } from "@/hooks/useNoteMutations";
import { toast } from "@/lib/toast";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * "Update" del detalle de proyecto (1g): registra un avance del proyecto (la
 * misma nota de actividad que la captura rápida guarda con `/update`, vía
 * `useNoteMutations().addNote`, que funciona sin red por el outbox). Aparece en
 * "Recent activity" y toca el proyecto.
 */
export function ProjectUpdateSheet({
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
  const { addNote } = useNoteMutations();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = text.trim().length > 0 && !busy;

  const save = async () => {
    if (!ready) return;
    setBusy(true);
    const ok = await addNote(projectId, text.trim());
    setBusy(false);
    if (ok) {
      toast.success(t("capture.saved.update"), 2000);
      setText("");
      onClose();
    } else {
      toast.error(t("capture.failed"));
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("views.projects.card.logUpdate")}
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
      <View>
        <FormInput
          value={text}
          onChangeText={setText}
          multiline
          autoFocus
          placeholder={t("capture.placeholder.update")}
          accessibilityLabel={t("views.projects.card.logUpdate")}
        />
      </View>
    </BottomSheet>
  );
}
