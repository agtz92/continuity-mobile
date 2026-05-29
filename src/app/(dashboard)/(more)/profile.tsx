import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@apollo/client/react";
import { useAuth } from "@/lib/auth";
import { PROFILE_QUERY, UPDATE_PROFILE } from "@/lib/graphql";
import { useUserAvatar } from "@/hooks/useUserAvatar";
import { AvatarPickerSheet } from "@/components/settings/AvatarPickerSheet";
import { Field } from "@/components/ui/Field";
import { FormInput } from "@/components/ui/FormInput";
import { toast } from "@/lib/toast";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

type ProfileData = { profile: { avatar: string | null; firstName: string | null } };

export default function Profile() {
  const { t, i18n } = useTranslation();
  const c = useThemeColors();
  const { session } = useAuth();
  const { avatarUrl } = useUserAvatar();
  const { data } = useQuery<ProfileData>(PROFILE_QUERY, {
    fetchPolicy: "cache-and-network",
  });
  const [updateProfile, { loading: saving }] = useMutation(UPDATE_PROFILE, {
    refetchQueries: [{ query: PROFILE_QUERY }],
  });

  const [pickerOpen, setPickerOpen] = useState(false);
  const [name, setName] = useState<string | null>(null);

  const serverName = data?.profile?.firstName ?? "";
  // Seed the editable name once the server value arrives (and whenever it
  // changes from a refetch), but don't clobber the field mid-edit.
  useEffect(() => {
    setName((prev) => (prev === null ? serverName : prev));
  }, [serverName]);

  const email = session?.user?.email ?? "—";
  const createdAt = session?.user?.created_at
    ? new Date(session.user.created_at).toLocaleDateString(i18n.language)
    : "";
  const initial = email !== "—" ? email.trim().charAt(0).toUpperCase() : "?";

  const current = name ?? "";
  const dirty = current.trim() !== serverName.trim();
  const canSave = dirty && !saving;

  const handleSaveName = async () => {
    if (!canSave) return;
    try {
      await updateProfile({ variables: { firstName: current.trim() || null } });
      toast.success(t("common.saved"));
    } catch {
      /* error link surfaces a toast */
    }
  };

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-4 p-5">
      {/* Avatar */}
      <View className="gap-3 rounded-2xl border border-border bg-surface p-5">
        <Text className="text-xs uppercase tracking-wider text-text-muted">
          {t("settings.profile.avatar")}
        </Text>
        <View className="flex-row items-center gap-4">
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 72, height: 72, borderRadius: 36 }}
            />
          ) : (
            <View
              className="h-[72px] w-[72px] items-center justify-center rounded-full"
              style={{ backgroundColor: alpha(c.accent, 0.15) }}
            >
              <Text className="text-2xl font-semibold text-accent">
                {initial}
              </Text>
            </View>
          )}
          <View className="flex-1 gap-1">
            <Pressable
              onPress={() => setPickerOpen(true)}
              accessibilityRole="button"
              className="self-start rounded-lg border border-border bg-bg px-3 py-1.5 active:opacity-80"
            >
              <Text className="text-sm text-text">
                {t("settings.profile.changeAvatar")}
              </Text>
            </Pressable>
            <Text className="text-xs text-text-muted">
              {t("settings.profile.avatarDescription")}
            </Text>
          </View>
        </View>
      </View>

      {/* Name */}
      <View className="gap-3 rounded-2xl border border-border bg-surface p-5">
        <Field label={t("settings.profile.name")}>
          <FormInput
            value={current}
            onChangeText={setName}
            placeholder={t("settings.profile.namePlaceholder")}
            maxLength={60}
            returnKeyType="done"
            onSubmitEditing={() => void handleSaveName()}
          />
        </Field>
        <Pressable
          onPress={() => void handleSaveName()}
          disabled={!canSave}
          accessibilityRole="button"
          className={
            "items-center rounded-lg py-3 " + (canSave ? "bg-accent" : "bg-border")
          }
        >
          <Text
            className={
              "font-semibold " + (canSave ? "text-bg" : "text-text-muted")
            }
          >
            {t("common.save")}
          </Text>
        </Pressable>
      </View>

      {/* Account info (read-only) */}
      <View className="gap-4 rounded-2xl border border-border bg-surface p-5">
        <View className="gap-1">
          <Text className="text-xs uppercase tracking-wider text-text-muted">
            {t("settings.profile.email")}
          </Text>
          <Text className="text-text">{email}</Text>
        </View>
        {createdAt !== "" && (
          <View className="gap-1">
            <Text className="text-xs uppercase tracking-wider text-text-muted">
              {t("settings.profile.memberSince")}
            </Text>
            <Text className="text-text">{createdAt}</Text>
          </View>
        )}
      </View>

      <AvatarPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
    </ScrollView>
  );
}
