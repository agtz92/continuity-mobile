import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { signInWithGoogle, OAuthCancelled } from "@/lib/oauth";
import { FormInput } from "@/components/ui/FormInput";
import {
  AuthButton,
  AuthError,
  AuthHeading,
  AuthLabel,
  AuthLinkRow,
  AuthScaffold,
  OrDivider,
  PasswordInput,
} from "@/components/auth/AuthParts";

export default function Signup() {
  const { t } = useTranslation();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
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

  // Mismo flujo que en login: Google crea la cuenta si no existe, y el gate de
  // auth manda al onboarding a quien aún no lo hizo.
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

  if (done) {
    return (
      <AuthScaffold>
        <AuthHeading title={t("auth.signup.headline")} lede={t("auth.signup.checkEmail")} />
        <AuthButton label={t("auth.signup.signInLink")} onPress={() => router.replace("/login")} />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold>
      <AuthHeading title={t("auth.signup.headline")} lede={t("auth.signup.subtitle")} />

      <View style={{ gap: 20 }}>
        <View style={{ gap: 8 }}>
          <AuthLabel label={t("auth.signup.name")} />
          <FormInput
            auth
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="given-name"
            textContentType="givenName"
            placeholder={t("auth.signup.namePlaceholder")}
            accessibilityLabel={t("auth.signup.name")}
          />
        </View>
        <View style={{ gap: 8 }}>
          <AuthLabel label={t("auth.signup.email")} />
          <FormInput
            auth
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder={t("auth.signup.emailPlaceholder")}
            accessibilityLabel={t("auth.signup.email")}
          />
        </View>
        <View style={{ gap: 8 }}>
          <AuthLabel label={t("auth.signup.password")} />
          <PasswordInput
            value={password}
            onChangeText={setPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder={t("auth.signup.passwordPlaceholder")}
            accessibilityLabel={t("auth.signup.password")}
          />
        </View>

        <AuthError message={error} />

        <AuthButton label={t("auth.signup.signUp")} onPress={() => void onSignUp()} busy={busy} />
        <OrDivider />
        <AuthButton
          variant="secondary"
          label={t("auth.login.google")}
          onPress={() => void onGoogle()}
          busy={googleBusy}
        />
      </View>

      <View className="flex-1 justify-end" style={{ paddingTop: 32 }}>
        <AuthLinkRow
          prompt={t("auth.signup.haveAccount")}
          label={t("auth.signup.signInLink")}
          onPress={() => router.replace("/login")}
        />
      </View>
    </AuthScaffold>
  );
}
