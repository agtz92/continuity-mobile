import { createContext, useContext, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

/** Solid accent CTA used across the onboarding steps: 52 px, radio 8. */
export function PrimaryButton({
  label,
  onPress,
  busy = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const c = useThemeColors();
  const off = busy || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off, busy }}
      className="flex-row items-center justify-center bg-accent active:opacity-80"
      style={[
        { height: SIZE.button, borderRadius: 8, gap: 8, paddingHorizontal: 20 },
        off ? { opacity: 0.5 } : null,
      ]}
    >
      {busy && <ActivityIndicator size="small" color={c.bg} />}
      <Text className="font-sans-semibold" style={{ fontSize: 16, color: c.bg }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Texto-botón apagado de 44 px de alto (Skip, Back, acciones secundarias). */
export function TextButton({
  label,
  onPress,
  disabled = false,
  tone = "muted",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "muted" | "accent";
}) {
  const c = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      className="items-center justify-center active:opacity-60"
      style={[{ minHeight: SIZE.hit, paddingHorizontal: 8 }, disabled ? { opacity: 0.5 } : null]}
    >
      <Text
        className={tone === "accent" ? "font-sans-semibold" : "font-sans-medium"}
        style={{ fontSize: 15, color: tone === "accent" ? c.accent : c.text2 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Titular de paso: display 34 + entradilla 16/23. */
export function StepHeading({ title, sub }: { title: string; sub?: string | null }) {
  const c = useThemeColors();
  return (
    <View style={{ gap: 10 }}>
      <Text
        accessibilityRole="header"
        className="font-display"
        style={{ fontSize: 34, lineHeight: 36, letterSpacing: -1, color: c.text }}
      >
        {title}
      </Text>
      {sub ? (
        <Text className="font-sans" style={{ fontSize: 16, lineHeight: 23, color: c.text2 }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

/** Etiqueta de grupo en versalitas de 11 px. */
export function StepLabel({ children }: { children: string }) {
  const c = useThemeColors();
  return (
    <Text
      className="font-sans-semibold uppercase"
      style={{ fontSize: 11, letterSpacing: 0.8, color: c.text3 }}
    >
      {children}
    </Text>
  );
}

/**
 * La fila "Back" de 44 px que pinta `onboarding.tsx` en los pasos 2–5. Viaja
 * por contexto para que cada paso la coloque al final de su contenido sin
 * tener que recibirla como prop.
 */
export const OnboardingBackContext = createContext<ReactNode>(null);

/**
 * Esqueleto de un paso: contenido con scroll (más la fila "Back") y el botón
 * primario en un **pie fijo** de 52 px, separado por un filete.
 */
export function StepLayout({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  const c = useThemeColors();
  const back = useContext(OnboardingBackContext);
  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 24 }}>{children}</View>
        {back ? <View style={{ marginTop: 20 }}>{back}</View> : null}
      </ScrollView>
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 8,
          borderTopWidth: 1,
          borderTopColor: c.line[14],
        }}
      >
        {footer}
      </View>
    </View>
  );
}
