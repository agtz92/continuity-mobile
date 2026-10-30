import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
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

export default function Login() {
  const { t } = useTranslation();
  const router = useRouter();

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
    <AuthScaffold>
      <AuthHeading title={t("auth.login.headline")} lede={t("auth.login.subtitle")} />

      <View style={{ gap: 20 }}>
        <View style={{ gap: 8 }}>
          <AuthLabel label={t("auth.login.email")} />
          <FormInput
            auth
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder={t("auth.login.emailPlaceholder")}
            accessibilityLabel={t("auth.login.email")}
          />
        </View>
        <View style={{ gap: 8 }}>
          <AuthLabel
            label={t("auth.login.password")}
            action={{ label: t("auth.login.forgotShort"), onPress: () => router.push("/reset-password") }}
          />
          <PasswordInput
            value={password}
            onChangeText={setPassword}
            autoComplete="current-password"
            textContentType="password"
            placeholder={t("auth.login.passwordPlaceholder")}
            accessibilityLabel={t("auth.login.password")}
            returnKeyType="go"
            onSubmitEditing={() => void onSignIn()}
          />
        </View>

        <AuthError message={error} />

        <AuthButton label={t("auth.login.signIn")} onPress={() => void onSignIn()} busy={busy} />
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
          prompt={t("auth.login.noAccount")}
          label={t("auth.login.signUpLink")}
          onPress={() => router.push("/signup")}
        />
      </View>
    </AuthScaffold>
  );
}
