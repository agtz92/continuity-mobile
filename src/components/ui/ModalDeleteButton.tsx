import { Pressable, Text } from "react-native";
import { Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { confirmAsync } from "@/lib/confirm";

const RED = "rgb(239,68,68)";
const RED_400 = "rgb(248,113,113)";
const RED_BORDER = "rgba(239,68,68,0.4)";

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
      style={{ borderColor: RED_BORDER }}
    >
      <Trash2 size={16} color={RED} />
      <Text className="text-base font-medium" style={{ color: RED_400 }}>
        {label}
      </Text>
    </Pressable>
  );
}
