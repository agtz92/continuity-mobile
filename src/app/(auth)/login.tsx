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
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { signInWithGoogle, OAuthCancelled } from "@/lib/oauth";
import { useTheme } from "@/theme/ThemeProvider";
import { THEME_SURFACES } from "@/theme/tokens";

export default function Login() {
  const { t } = useTranslation();
  const router = useRouter();
  const { effective } = useTheme();
  const muted = THEME_SURFACES[effective].textMuted;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSignIn() {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (err) setError(err.message);
    setBusy(false);
    // On success the auth gate redirects to /today.
  }

  async function onGoogle() {
    setGoogleBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      if (!(e instanceof OAuthCancelled)) {
        setError(e instanceof Error ? e.message : t("auth.errors.generic"));
      }
    } finally {
      setGoogleBusy(false);
    }
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
              {t("auth.login.title")}
            </Text>
            <Text className="text-base text-text-muted">{t("auth.login.subtitle")}</Text>
          </View>

          <View className="gap-3">
            <View className="gap-1">
              <Text className="text-sm font-medium text-text">
                {t("auth.login.email")}
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder={t("auth.login.emailPlaceholder")}
                placeholderTextColor={muted}
                className="rounded-xl border border-border bg-surface px-4 py-3 text-text"
              />
            </View>
            <View className="gap-1">
              <Text className="text-sm font-medium text-text">
                {t("auth.login.password")}
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="current-password"
                placeholder={t("auth.login.passwordPlaceholder")}
                placeholderTextColor={muted}
                className="rounded-xl border border-border bg-surface px-4 py-3 text-text"
              />
            </View>

            <Pressable
              onPress={() => router.push("/reset-password")}
              className="self-end"
            >
              <Text className="text-sm text-accent">
                {t("auth.login.forgot")}
              </Text>
            </Pressable>

            {error && <Text className="text-red-500">{error}</Text>}

            <Pressable
              onPress={onSignIn}
              disabled={busy}
              className="mt-1 flex-row items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3"
            >
              {busy && <ActivityIndicator size="small" />}
              <Text className="text-base font-semibold text-bg">
                {t("auth.login.signIn")}
              </Text>
            </Pressable>
          </View>

          <View className="flex-row items-center gap-3">
            <View className="h-px flex-1 bg-border" />
            <Text className="text-base text-text-muted">{t("auth.divider")}</Text>
            <View className="h-px flex-1 bg-border" />
          </View>

          <Pressable
            onPress={onGoogle}
            disabled={googleBusy}
            className="flex-row items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3"
          >
            {googleBusy && <ActivityIndicator size="small" />}
            <Text className="text-base font-semibold text-text">
              {t("auth.login.google")}
            </Text>
          </Pressable>

          <View className="flex-row justify-center gap-1">
            <Text className="text-base text-text-muted">{t("auth.login.noAccount")}</Text>
            <Pressable onPress={() => router.push("/signup")}>
              <Text className="text-base font-semibold text-accent">
                {t("auth.login.signUpLink")}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
