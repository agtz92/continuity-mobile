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
import { X } from "lucide-react-native";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Chrome for a modal-presented form screen: a header (title + close), a
 * keyboard-aware scrollable body, and a sticky Save/Cancel footer. Mirrors the
 * web `Modal` (title/footer/onClose) but as a native slide-up stack screen.
 */
export function ModalScaffold({
  title,
  onSave,
  saveLabel,
  canSave = true,
  saving = false,
  children,
}: {
  title: string;
  onSave: () => void;
  /** Defaults to common.save. */
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
      <View className="flex-row items-center justify-between border-b border-border px-4 pb-3 pt-6">
        <Text className="text-base font-semibold text-text">{title}</Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("common.cancel")}
        >
          <X size={22} color={c.textMuted} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerClassName="gap-3 p-4"
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>

        <View className="flex-row gap-2 border-t border-border px-4 py-3">
          <Pressable
            onPress={onSave}
            disabled={!enabled}
            accessibilityRole="button"
            className={
              "flex-1 items-center rounded-lg py-3 " +
              (enabled ? "bg-accent" : "bg-border")
            }
          >
            <Text
              className={
                "font-semibold " + (enabled ? "text-bg" : "text-text-muted")
              }
            >
              {saveLabel ?? t("common.save")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            className="rounded-lg border border-border bg-surface px-5 py-3"
          >
            <Text className="text-text">{t("common.cancel")}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
