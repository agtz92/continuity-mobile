import { useEffect, useState } from "react";
import { Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@apollo/client/react";
import { AlertTriangle } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { DELETE_ACCOUNT, PROFILE_QUERY, UPDATE_PROFILE } from "@/lib/graphql";
import { useUserAvatar } from "@/hooks/useUserAvatar";
import { AvatarPickerSheet } from "@/components/settings/AvatarPickerSheet";
import { Field } from "@/components/ui/Field";
import { FormInput } from "@/components/ui/FormInput";
import { confirmAsync } from "@/lib/confirm";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

type ProfileData = { profile: { avatar: string | null; firstName: string | null } };

const BILLING_URL = "https://continuu.it/settings/billing";

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
  const [deleteAccountMutation, { loading: deleting }] =
    useMutation(DELETE_ACCOUNT);

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

  // Double-confirm, then permanently delete the account (Apple requirement).
  const handleDeleteAccount = async () => {
    if (deleting) return;
    const first = await confirmAsync(
      t("settings.deleteAccount.confirm1Title"),
      t("settings.deleteAccount.confirm1Body"),
      t("settings.deleteAccount.confirm1Cta"),
      t("common.cancel"),
    );
    if (!first) return;
    const second = await confirmAsync(
      t("settings.deleteAccount.confirm2Title"),
      t("settings.deleteAccount.confirm2Body"),
      t("settings.deleteAccount.confirm2Cta"),
      t("common.cancel"),
    );
    if (!second) return;
    try {
      await deleteAccountMutation();
      // Account + data are gone; sign out so the auth gate sends us to /login.
      await supabase.auth.signOut();
    } catch {
      toast.error(t("settings.deleteAccount.error"));
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
              "text-base font-semibold " + (canSave ? "text-bg" : "text-text-muted")
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
          <Text className="text-base text-text">{email}</Text>
        </View>
        {createdAt !== "" && (
          <View className="gap-1">
            <Text className="text-xs uppercase tracking-wider text-text-muted">
              {t("settings.profile.memberSince")}
            </Text>
            <Text className="text-base text-text">{createdAt}</Text>
          </View>
        )}
      </View>

      {/* Danger zone — account deletion (Apple requirement) */}
      <View
        className="gap-3 rounded-2xl border p-5"
        style={{
          borderColor: "rgba(239,68,68,0.4)",
          backgroundColor: "rgba(239,68,68,0.06)",
        }}
      >
        <View className="flex-row items-center gap-2">
          <AlertTriangle size={16} color="rgb(248,113,113)" />
          <Text
            className="text-base font-semibold"
            style={{ color: "rgb(248,113,113)" }}
          >
            {t("settings.deleteAccount.title")}
          </Text>
        </View>
        <Text className="text-sm text-text-muted">
          {t("settings.deleteAccount.body")}
        </Text>
        <Text className="text-sm text-text-muted">
          {t("settings.deleteAccount.subscriptionWarning")}
        </Text>
        <Pressable
          onPress={() => void Linking.openURL(BILLING_URL)}
          accessibilityRole="button"
          hitSlop={6}
          className="self-start"
        >
          <Text className="text-sm font-medium text-accent underline">
            {t("settings.deleteAccount.manageSubscription")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => void handleDeleteAccount()}
          disabled={deleting}
          accessibilityRole="button"
          className="items-center rounded-lg py-3"
          style={{ backgroundColor: "rgb(220,38,38)", opacity: deleting ? 0.6 : 1 }}
        >
          <Text className="text-base font-semibold text-white">
            {deleting
              ? t("settings.deleteAccount.deleting")
              : t("settings.deleteAccount.button")}
          </Text>
        </Pressable>
      </View>

      <AvatarPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
    </ScrollView>
  );
}
