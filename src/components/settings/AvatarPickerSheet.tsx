import { Image, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useUserAvatar } from "@/hooks/useUserAvatar";
import { AVATAR_CATALOG, getAvatarSource } from "@/lib/avatars";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Avatar chooser presented as a bottom sheet. Mirrors the web
 * AvatarPickerModal: one grid, tap to set, footer link to remove.
 */
export function AvatarPickerSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const { avatarId, setAvatar } = useUserAvatar();

  const handlePick = async (id: string) => {
    const ok = await setAvatar(id);
    if (ok) onClose();
  };

  const handleClear = async () => {
    const ok = await setAvatar(null);
    if (ok) onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("settings.profile.pickerTitle")}
      initialHeight="large"
      footer={
        <Pressable
          onPress={() => void handleClear()}
          accessibilityRole="button"
          className="items-center py-1"
        >
          <Text className="font-sans text-sm text-text-muted">
            {t("settings.profile.clearAvatar")}
          </Text>
        </Pressable>
      }
    >
      <View className="flex-row flex-wrap gap-x-4 gap-y-4">
        {AVATAR_CATALOG.map((a) => {
          const selected = a.id === avatarId;
          return (
            <Pressable
              key={a.id}
              onPress={() => void handlePick(a.id)}
              accessibilityRole="button"
              accessibilityLabel={t(`avatars.names.${a.nameKey}`)}
              className="w-16 items-center gap-1.5"
            >
              <Image
                source={getAvatarSource(a.id) ?? undefined}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? c.accent : c.border,
                }}
              />
              <Text
                numberOfLines={1}
                className="font-sans text-[11px] text-text-muted"
              >
                {t(`avatars.names.${a.nameKey}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}
