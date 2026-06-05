import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/theme/ThemeProvider";
import { THEME_SURFACES } from "@/theme/tokens";

export default function ResetPassword() {
  const { t } = useTranslation();
  const router = useRouter();
  const { effective } = useTheme();
  const muted = THEME_SURFACES[effective].textMuted;

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSend() {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: Linking.createURL("auth/reset") },
    );
    if (err) setError(err.message);
    else setSent(true);
    setBusy(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerClassName="flex-grow justify-center gap-6 p-6">
          <View className="gap-1">
            <Text className="text-3xl font-bold text-text">
              {t("auth.reset.title")}
            </Text>
            <Text className="text-base text-text-muted">{t("auth.reset.subtitle")}</Text>
          </View>

          {sent ? (
            <Text className="text-base text-text">{t("auth.reset.sent")}</Text>
          ) : (
            <View className="gap-3">
              <View className="gap-1">
                <Text className="text-sm font-medium text-text">
                  {t("auth.reset.email")}
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  placeholder={t("auth.reset.emailPlaceholder")}
                  placeholderTextColor={muted}
                  className="rounded-xl border border-border bg-surface px-4 py-3 text-text"
                />
              </View>

              {error && <Text className="text-red-500">{error}</Text>}

              <Pressable
                onPress={onSend}
                disabled={busy}
                className="mt-1 flex-row items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3"
              >
                {busy && <ActivityIndicator size="small" />}
                <Text className="text-base font-semibold text-bg">
                  {t("auth.reset.send")}
                </Text>
              </Pressable>
            </View>
          )}

          <Pressable onPress={() => router.replace("/login")} className="self-center">
            <Text className="text-base font-semibold text-accent">
              {t("auth.reset.backToLogin")}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
