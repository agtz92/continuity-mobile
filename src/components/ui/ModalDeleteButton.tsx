import { Pressable, Text } from "react-native";
import { Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { confirmAsync } from "@/lib/confirm";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

/**
 * Destructive delete button for the bottom of an edit form (task/routine).
 * Delete lives here (in the edit detail), not on the list row where it sat one
 * mis-tap from the completion toggle. Taps route through `confirmAsync`, which
 * shows a native confirm and fires the warning haptic before deleting.
 */
export function ModalDeleteButton({
  label,
  confirmTitle,
  confirmBody,
  onConfirm,
}: {
  label: string;
  confirmTitle: string;
  confirmBody?: string;
  onConfirm: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const handle = async () => {
    const ok = await confirmAsync(
      confirmTitle,
      confirmBody,
      t("common.delete"),
      t("common.cancel")
    );
    if (ok) await onConfirm();
  };
  return (
    <Pressable
      onPress={handle}
      accessibilityRole="button"
      className="mt-1 flex-row items-center justify-center gap-2 rounded-lg border py-3"
      style={{ borderColor: alpha(c.signal, 0.4) }}
    >
      <Trash2 size={16} color={c.signal} />
      <Text className="text-base font-sans-medium" style={{ color: c.signal }}>
        {label}
      </Text>
    </Pressable>
  );
}
