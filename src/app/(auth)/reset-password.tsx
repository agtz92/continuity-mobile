import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { FormInput } from "@/components/ui/FormInput";
import { useThemeColors } from "@/theme/useThemeColors";
import {
  AuthBackRow,
  AuthButton,
  AuthError,
  AuthHeading,
  AuthLabel,
  AuthScaffold,
} from "@/components/auth/AuthParts";

/**
 * Pide el enlace de recuperación. El enlace vuelve a `auth/reset`
 * (`src/app/auth/reset.tsx`), que canjea el código y pide la contraseña nueva.
 * Con PKCE el canje necesita el verificador que se guardó **en este teléfono**
 * al pedir el enlace: por eso el texto dice que se abra aquí.
 */
export default function ResetPassword() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();

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

  const goLogin = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/login");
  };

  return (
    <AuthScaffold top={<AuthBackRow label={t("auth.signup.signInLink")} onPress={goLogin} />}>
      <AuthHeading title={t("auth.reset.headline")} lede={t("auth.reset.lede")} />

      {sent ? (
        <Text
          accessibilityLiveRegion="polite"
          className="font-sans"
          style={{ fontSize: 16, lineHeight: 23, color: c.text }}
        >
          {t("auth.reset.sent")}
        </Text>
      ) : (
        <View style={{ gap: 20 }}>
          <View style={{ gap: 8 }}>
            <AuthLabel label={t("auth.reset.email")} />
            <FormInput
              auth
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder={t("auth.reset.emailPlaceholder")}
              accessibilityLabel={t("auth.reset.email")}
              returnKeyType="send"
              onSubmitEditing={() => void onSend()}
            />
          </View>
          <AuthError message={error} />
          <AuthButton
            label={t("auth.reset.send")}
            onPress={() => void onSend()}
            busy={busy}
            disabled={!email.trim()}
          />
        </View>
      )}

      {/* "Después de enviar", bajo regla de 3 px. */}
      <View style={{ marginTop: 32, borderTopWidth: 3, borderTopColor: c.text, paddingTop: 14, gap: 8 }}>
        <Text
          className="font-sans-semibold uppercase"
          style={{ fontSize: 11, letterSpacing: 0.8, color: c.text3 }}
        >
          {t("auth.reset.afterTitle")}
        </Text>
        <Text className="font-sans" style={{ fontSize: 15, lineHeight: 22, color: c.text2 }}>
          {t("auth.reset.afterBody")}
        </Text>
      </View>
    </AuthScaffold>
  );
}
