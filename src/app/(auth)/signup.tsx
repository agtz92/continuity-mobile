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

export default function Signup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { effective } = useTheme();
  const muted = THEME_SURFACES[effective].textMuted;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSignUp() {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: Linking.createURL("auth/callback"),
      },
    });
    if (err) setError(err.message);
    else setDone(true);
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
              {t("auth.signup.title")}
            </Text>
            <Text className="text-text-muted">{t("auth.signup.subtitle")}</Text>
          </View>

          {done ? (
            <View className="gap-4">
              <Text className="text-text">{t("auth.signup.checkEmail")}</Text>
              <Pressable
                onPress={() => router.replace("/login")}
                className="flex-row items-center justify-center rounded-xl bg-accent px-4 py-3"
              >
                <Text className="font-semibold text-bg">
                  {t("auth.signup.signInLink")}
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View className="gap-3">
                <View className="gap-1">
                  <Text className="text-sm font-medium text-text">
                    {t("auth.signup.name")}
                  </Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoComplete="given-name"
                    placeholder={t("auth.signup.namePlaceholder")}
                    placeholderTextColor={muted}
                    className="rounded-xl border border-border bg-surface px-4 py-3 text-text"
                  />
                </View>
                <View className="gap-1">
                  <Text className="text-sm font-medium text-text">
                    {t("auth.signup.email")}
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder={t("auth.signup.emailPlaceholder")}
                    placeholderTextColor={muted}
                    className="rounded-xl border border-border bg-surface px-4 py-3 text-text"
                  />
                </View>
                <View className="gap-1">
                  <Text className="text-sm font-medium text-text">
                    {t("auth.signup.password")}
                  </Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete="new-password"
                    placeholder={t("auth.signup.passwordPlaceholder")}
                    placeholderTextColor={muted}
                    className="rounded-xl border border-border bg-surface px-4 py-3 text-text"
                  />
                </View>

                {error && <Text className="text-red-500">{error}</Text>}

                <Pressable
                  onPress={onSignUp}
                  disabled={busy}
                  className="mt-1 flex-row items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3"
                >
                  {busy && <ActivityIndicator size="small" />}
                  <Text className="font-semibold text-bg">
                    {t("auth.signup.signUp")}
                  </Text>
                </Pressable>
              </View>

              <View className="flex-row justify-center gap-1">
                <Text className="text-text-muted">
                  {t("auth.signup.haveAccount")}
                </Text>
                <Pressable onPress={() => router.replace("/login")}>
                  <Text className="font-semibold text-accent">
                    {t("auth.signup.signInLink")}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
