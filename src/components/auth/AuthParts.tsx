import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Eye, EyeOff } from "lucide-react-native";

import { FormInput } from "@/components/ui/FormInput";
import { IconAction } from "@/components/ui/IconAction";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Piezas compartidas de las pantallas de acceso (login, alta, recuperar y
 * fijar contraseña) del rediseño "Breathe": regla de 3 px en `accent` arriba,
 * titular display 36/38, inputs de 52, botones de 52, separador "or" en
 * versalitas y enlaces secundarios como filas de 44.
 */

/** Pantalla de acceso: safe-area, teclado y scroll. `top` va sobre la regla. */
export function AuthScaffold({
  top,
  children,
}: {
  /** Fila de "volver" (Reset). */
  top?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {top}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Regla de acento + titular display 36/38 + entradilla. */
export function AuthHeading({ title, lede }: { title: string; lede?: string | null }) {
  const c = useThemeColors();
  return (
    <View style={{ gap: 12, marginBottom: 28 }}>
      <View style={{ width: 40, height: 3, backgroundColor: c.accent, marginBottom: 20 }} />
      <Text
        accessibilityRole="header"
        className="font-display"
        style={{ fontSize: 36, lineHeight: 38, letterSpacing: -1, color: c.text }}
      >
        {title}
      </Text>
      {lede ? (
        <Text className="font-sans" style={{ fontSize: 16, lineHeight: 23, color: c.text2 }}>
          {lede}
        </Text>
      ) : null}
    </View>
  );
}

/** Etiqueta en versalitas de 11 px; `action` es un enlace a la derecha ("Forgot?"). */
export function AuthLabel({
  label,
  action,
}: {
  label: string;
  action?: { label: string; onPress: () => void } | null;
}) {
  const c = useThemeColors();
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text
        className="font-sans-semibold uppercase"
        style={{ fontSize: 11, letterSpacing: 0.8, color: c.text3 }}
      >
        {label}
      </Text>
      {action ? (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="link"
          accessibilityLabel={action.label}
          // El texto mide ~18; el hitSlop completa los 44 sin empujar el input.
          hitSlop={{ top: 13, bottom: 13, left: 12, right: 12 }}
          className="active:opacity-60"
        >
          <Text className="font-sans-medium" style={{ fontSize: 14, color: c.accent }}>
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Input de contraseña de 52 con el ojo de mostrar/ocultar a 44. */
export function PasswordInput(props: TextInputProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <FormInput
        auth
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
        style={{ paddingRight: SIZE.hit + 8 }}
      />
      <View style={{ position: "absolute", right: 4, top: (SIZE.inputAuth - SIZE.hit) / 2 }}>
        <IconAction
          icon={visible ? EyeOff : Eye}
          label={visible ? t("auth.password.hide") : t("auth.password.show")}
          onPress={() => setVisible((v) => !v)}
        />
      </View>
    </View>
  );
}

/** Botón de 52: `primary` sólido en accent; `secondary` en surface con filete. */
export function AuthButton({
  label,
  onPress,
  busy = false,
  disabled = false,
  variant = "primary",
  leading,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  leading?: ReactNode;
}) {
  const c = useThemeColors();
  const primary = variant === "primary";
  const off = busy || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off, busy }}
      className="flex-row items-center justify-center active:opacity-80"
      style={[
        { height: SIZE.button, borderRadius: 8, gap: 10, paddingHorizontal: 16 },
        primary
          ? { backgroundColor: c.accent }
          : { backgroundColor: c.surface, borderWidth: 1, borderColor: c.line[18] },
        off ? { opacity: 0.6 } : null,
      ]}
    >
      {busy ? <ActivityIndicator size="small" color={primary ? c.bg : c.text} /> : leading}
      <Text
        className="font-sans-semibold"
        style={{ fontSize: 16, color: primary ? c.bg : c.text }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Separador "or" en versalitas entre dos reglas. */
export function OrDivider() {
  const { t } = useTranslation();
  const c = useThemeColors();
  return (
    <View className="flex-row items-center" style={{ gap: 14 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: c.line[14] }} />
      <Text
        className="font-sans-semibold uppercase"
        style={{ fontSize: 11, letterSpacing: 1.2, color: c.text3 }}
      >
        {t("auth.divider")}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: c.line[14] }} />
    </View>
  );
}

/** Enlace secundario como fila de 44: "No account? Create one". */
export function AuthLinkRow({
  prompt,
  label,
  onPress,
}: {
  prompt?: string;
  label: string;
  onPress: () => void;
}) {
  const c = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={prompt ? `${prompt} ${label}` : label}
      className="flex-row flex-wrap items-center justify-center active:opacity-60"
      style={{ minHeight: SIZE.hit, gap: 6 }}
    >
      {prompt ? (
        <Text className="font-sans" style={{ fontSize: 15, color: c.text3 }}>
          {prompt}
        </Text>
      ) : null}
      <Text className="font-sans-semibold" style={{ fontSize: 15, color: c.accent }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Fila de volver: flecha de 24 en caja de 44 + nombre del destino. */
export function AuthBackRow({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useThemeColors();
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t("common.back")}: ${label}`}
      className="flex-row items-center self-start active:opacity-60"
      style={{ height: SIZE.hit, marginLeft: 8, marginTop: 4, paddingRight: 8 }}
    >
      <View style={{ width: SIZE.hit, height: SIZE.hit, alignItems: "center", justifyContent: "center" }}>
        <ArrowLeft size={24} color={c.text} />
      </View>
      <Text className="font-sans-medium" style={{ fontSize: 15, color: c.text2 }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Mensaje de error en `signal`, bajo el formulario. */
export function AuthError({ message }: { message: string | null }) {
  const c = useThemeColors();
  if (!message) return null;
  return (
    <Text
      accessibilityLiveRegion="polite"
      className="font-sans"
      style={{ fontSize: 15, lineHeight: 21, color: c.signal }}
    >
      {message}
    </Text>
  );
}
