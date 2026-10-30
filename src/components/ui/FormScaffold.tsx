import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { closeModal } from "@/lib/closeModal";
import { SIZE } from "@/theme/tokens";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Chrome de los formularios presentados como modal (v2 de `ModalScaffold`).
 *
 * Cabecera: título en display a 20 px y "Cancel" como **texto** de 44 px a la
 * derecha. Pie fijo con **un solo** botón primario de 52 px: antes Guardar y
 * Cancelar competían lado a lado y el botón deshabilitado se pintaba con el
 * gris de `border`, que se confundía con un input.
 */
export function FormScaffold({
  title,
  onSave,
  saveLabel,
  canSave = true,
  saving = false,
  children,
}: {
  title: string;
  onSave: () => void;
  /** Por defecto `common.save`. */
  saveLabel?: string;
  canSave?: boolean;
  saving?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const c = useThemeColors();
  const { t } = useTranslation();
  const enabled = canSave && !saving;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["bottom"]}>
      <View
        className="flex-row items-center justify-between"
        style={{
          paddingLeft: SIZE.gutter,
          paddingRight: 8,
          paddingTop: 18,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: c.line[14],
        }}
      >
        <Text
          accessibilityRole="header"
          className="min-w-0 flex-1 font-display"
          style={{ fontSize: 20, lineHeight: 24, letterSpacing: -0.4, color: c.text }}
        >
          {title}
        </Text>
        <Pressable
          onPress={() => closeModal(router)}
          accessibilityRole="button"
          accessibilityLabel={t("common.cancel")}
          className="items-center justify-center active:opacity-60"
          style={{ height: SIZE.hit, paddingHorizontal: 12 }}
        >
          <Text className="font-sans-medium" style={{ fontSize: 15, color: c.text2 }}>
            {t("common.cancel")}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ gap: SIZE.sectionGap, padding: SIZE.gutter, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>

        <View
          style={{
            paddingHorizontal: SIZE.gutter,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: c.line[14],
          }}
        >
          <Pressable
            onPress={onSave}
            disabled={!enabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: !enabled }}
            className="items-center justify-center active:opacity-80"
            style={{
              height: SIZE.button,
              borderRadius: 8,
              backgroundColor: c.accent,
              opacity: enabled ? 1 : 0.4,
            }}
          >
            <Text className="font-sans-semibold" style={{ fontSize: 16, color: c.bg }}>
              {saveLabel ?? t("common.save")}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
