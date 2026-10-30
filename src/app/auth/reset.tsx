import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import {
  claimRecoveryCode,
  clearRecoveryPending,
  isRecoveryPending,
  linkParams,
  markRecoveryPending,
  classifyRecoveryError,
  releaseRecoveryCode,
  type RecoveryFailure,
} from "@/lib/passwordRecovery";
import { useThemeColors } from "@/theme/useThemeColors";
import {
  AuthButton,
  AuthError,
  AuthHeading,
  AuthLabel,
  AuthLinkRow,
  AuthScaffold,
  PasswordInput,
} from "@/components/auth/AuthParts";

const MIN_LENGTH = 8;
/** Reintentos del canje cuando falla por red (ms antes de cada uno). */
const RETRY_DELAYS = [800, 2000, 4000];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Phase = "checking" | "form" | "invalid";

/**
 * Destino del enlace "restablecer contraseña" del correo
 * (`Linking.createURL("auth/reset")` → `continuity://auth/reset?code=…`).
 *
 * 1. Canjea el `code` PKCE por una sesión (`exchangeCodeForSession`).
 * 2. Pide la contraseña nueva y la guarda con `updateUser({ password })`.
 * 3. La sesión ya quedó iniciada: entra a la app.
 *
 * Enlace vencido, ya usado o abierto en otro teléfono (falta el verificador
 * PKCE local) → mensaje claro y botón para pedir otro.
 *
 * El gate de auth (`_layout.tsx`) no toca las rutas `auth/*` y, mientras
 * `isRecoveryPending()`, devuelve aquí a quien el remount de `CachePersistGate`
 * haya movido. Ver `src/lib/passwordRecovery.ts`.
 */
export default function ResetFromLink() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_code?: string;
    error_description?: string;
  }>();
  const url = Linking.useURL();

  const [phase, setPhase] = useState<Phase>("checking");
  // Por qué falló, en términos del usuario. El mensaje crudo de Supabase va a
  // la consola, nunca a la pantalla: está en inglés y habla de PKCE.
  const [failure, setFailure] = useState<RecoveryFailure>("unknown");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const fromUrl = linkParams(url);
  const code = (params.code as string | undefined) ?? fromUrl.code;
  const linkError =
    (params.error_code as string | undefined) ??
    fromUrl.error_code ??
    (params.error as string | undefined) ??
    fromUrl.error ??
    null;

  useEffect(() => {
    let cancelled = false;
    const fail = (why: RecoveryFailure) => {
      clearRecoveryPending();
      if (!cancelled) {
        setFailure(why);
        setPhase("invalid");
      }
    };

    (async () => {
      if (linkError) {
        // Supabase rechazó el enlace antes de mandarlo aquí (vencido o usado).
        console.warn("[auth/reset] link error:", linkError);
        fail("expired");
        return;
      }
      if (code && claimRecoveryCode(code)) {
        markRecoveryPending();
        // Al volver de Safari, iOS puede tardar un instante en devolverle la
        // red a la app: la primera petición falla con "Network request
        // failed" sin llegar a Supabase. Se reintenta con espera creciente.
        let { error } = await supabase.auth.exchangeCodeForSession(code);
        for (const ms of RETRY_DELAYS) {
          if (!error || classifyRecoveryError(error) !== "network" || cancelled) break;
          await wait(ms);
          ({ error } = await supabase.auth.exchangeCodeForSession(code));
        }
        if (error) {
          console.warn("[auth/reset] exchangeCodeForSession:", error.name, error.code, error.message);
          const kind = classifyRecoveryError(error);
          // Un fallo de red no gastó el código: se puede reintentar tal cual.
          if (kind === "network") releaseRecoveryCode(code);
          fail(kind);
        } else if (!cancelled) {
          setPhase("form");
        }
        return;
      }
      // Código ya canjeado (la pantalla se volvió a montar al cambiar la
      // sesión) o llegamos sin código porque el gate nos devolvió aquí.
      const { data } = await supabase.auth.getSession();
      if (data.session && isRecoveryPending()) {
        if (!cancelled) setPhase("form");
      } else {
        fail("unknown");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, linkError, attempt]);

  async function onSave() {
    setFormError(null);
    if (password.length < MIN_LENGTH) {
      setFormError(t("auth.newPassword.errorTooShort"));
      return;
    }
    if (password !== confirm) {
      setFormError(t("auth.newPassword.errorMismatch"));
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      console.warn("[auth/reset] updateUser:", error.code, error.message);
      setFormError(
        t(
          error.code === "same_password"
            ? "auth.newPassword.errorSame"
            : error.code === "weak_password"
              ? "auth.newPassword.errorWeak"
              : "auth.newPassword.errorSave",
        ),
      );
      setSaving(false);
      return;
    }
    clearRecoveryPending();
    toast.success(t("auth.newPassword.saved"));
    // La sesión ya está iniciada; si falta el onboarding, el gate redirige.
    router.replace("/today");
  }

  // Salir sin cambiar nada: la sesión de recuperación no debe quedarse abierta.
  async function onCancel() {
    clearRecoveryPending();
    await supabase.auth.signOut().catch(() => undefined);
    router.replace("/login");
  }

  if (phase === "checking") {
    return (
      <AuthScaffold>
        <View className="flex-1 items-center justify-center" style={{ gap: 16 }}>
          <ActivityIndicator color={c.accent} />
          <Text className="font-sans" style={{ fontSize: 15, color: c.text2 }}>
            {t("auth.newPassword.verifying")}
          </Text>
        </View>
      </AuthScaffold>
    );
  }

  if (phase === "invalid") {
    return (
      <AuthScaffold>
        <AuthHeading
          title={t(`auth.newPassword.failure.${failure}.title`)}
          lede={t(`auth.newPassword.failure.${failure}.body`)}
        />
        <View style={{ gap: 12 }}>
          {failure === "network" ? (
            <AuthButton
              label={t("auth.newPassword.retry")}
              onPress={() => {
                setPhase("checking");
                setAttempt((n) => n + 1);
              }}
            />
          ) : (
            <AuthButton
              label={t("auth.newPassword.requestNew")}
              onPress={() => router.replace("/reset-password")}
            />
          )}
          <AuthLinkRow label={t("auth.reset.backToLogin")} onPress={() => router.replace("/login")} />
        </View>
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold>
      <AuthHeading title={t("auth.newPassword.headline")} lede={t("auth.newPassword.lede")} />
      <View style={{ gap: 20 }}>
        <View style={{ gap: 8 }}>
          <AuthLabel label={t("auth.newPassword.password")} />
          <PasswordInput
            value={password}
            onChangeText={setPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder={t("auth.signup.passwordPlaceholder")}
            accessibilityLabel={t("auth.newPassword.password")}
            autoFocus
          />
        </View>
        <View style={{ gap: 8 }}>
          <AuthLabel label={t("auth.newPassword.confirm")} />
          <PasswordInput
            value={confirm}
            onChangeText={setConfirm}
            autoComplete="new-password"
            textContentType="newPassword"
            accessibilityLabel={t("auth.newPassword.confirm")}
            returnKeyType="done"
            onSubmitEditing={() => void onSave()}
          />
        </View>
        <AuthError message={formError} />
        <AuthButton
          label={t("auth.newPassword.save")}
          onPress={() => void onSave()}
          busy={saving}
          disabled={!password || !confirm}
        />
        <AuthLinkRow label={t("auth.reset.backToLogin")} onPress={() => void onCancel()} />
      </View>
    </AuthScaffold>
  );
}
