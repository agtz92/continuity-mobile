import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  AVATAR_STYLES,
  avatarsByStyle,
  getAvatarUrl,
  type AvatarStyle,
} from "@/lib/avatars";
import { useThemeColors } from "@/theme/useThemeColors";
import { PrimaryButton } from "./controls";

/**
 * Step 3 — avatar picker. Same grouped grid as the settings AvatarPickerSheet,
 * but selection is local and only committed on Next (the flow persists it via
 * updateProfile). Avatar is optional — Next proceeds with whatever is selected
 * (or null if untouched), matching the web Step3Avatar.
 */
export function Step3Avatar({
  name,
  initialAvatar,
  busy,
  onNext,
}: {
  name: string;
  initialAvatar: string | null;
  busy: boolean;
  onNext: (avatarId: string | null) => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const grouped = avatarsByStyle();
  const [selected, setSelected] = useState<string | null>(initialAvatar);

  return (
    <View className="gap-6">
      <View className="gap-2">
        <Text className="text-3xl font-bold text-text">
          {t("onboarding.step3.heading", { name })}
        </Text>
        <Text className="text-base text-text-muted">
          {t("onboarding.step3.sub")}
        </Text>
      </View>

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
                  const isSel = a.id === selected;
                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => setSelected(isSel ? null : a.id)}
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
                          borderWidth: isSel ? 2 : 1,
                          borderColor: isSel ? c.accent : c.border,
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

      <PrimaryButton
        label={t("onboarding.next")}
        onPress={() => onNext(selected)}
        busy={busy}
      />
    </View>
  );
}
