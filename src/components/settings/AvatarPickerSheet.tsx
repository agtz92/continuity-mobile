import { Image, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useUserAvatar } from "@/hooks/useUserAvatar";
import {
  AVATAR_STYLES,
  avatarsByStyle,
  getAvatarUrl,
  type AvatarStyle,
} from "@/lib/avatars";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Avatar chooser presented as a bottom sheet. Mirrors the web
 * AvatarPickerModal: grouped by style, tap to set, footer link to remove.
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
  const grouped = avatarsByStyle();

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
          <Text className="text-sm text-text-muted">
            {t("settings.profile.clearAvatar")}
          </Text>
        </Pressable>
      }
    >
      <View className="gap-6">
        {AVATAR_STYLES.map((style: AvatarStyle) => {
          const items = grouped[style];
          if (items.length === 0) return null;
          return (
            <View key={style} className="gap-3">
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                {t(`avatars.styles.${style}`)}
              </Text>
              <View className="flex-row flex-wrap gap-x-4 gap-y-4">
                {items.map((a) => {
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
                        source={{ uri: getAvatarUrl(a.id) }}
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
                        className="text-[11px] text-text-muted"
                      >
                        {t(`avatars.names.${a.nameKey}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </BottomSheet>
  );
}
