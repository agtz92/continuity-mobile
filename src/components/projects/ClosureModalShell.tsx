import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { useTheme, useThemeVars } from "@/theme/ThemeProvider";
import { THEME_SURFACES } from "@/theme/tokens";

/**
 * Centered card modal used by the closure flows (pause/kill/revive/stalled).
 * Built on RN <Modal> so it works in Expo Go. Theme vars are re-injected at the
 * root because <Modal> renders in a separate host tree (see AGENTS rule 6).
 *
 * The backdrop / X both call `onClose`. For pause/kill that means "revert to
 * previous status (no partial save)" — the caller handles not persisting.
 */
export function ClosureModalShell({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  dismissible = true,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer: ReactNode;
  dismissible?: boolean;
}) {
  const themeVars = useThemeVars();
  const insets = useSafeAreaInsets();
  const { effective } = useTheme();
  const s = THEME_SURFACES[effective];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (dismissible) onClose();
      }}
    >
      <View style={[StyleSheet.absoluteFill, themeVars]}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.7)" }]}
          onPress={dismissible ? onClose : undefined}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[
            StyleSheet.absoluteFill,
            { justifyContent: "center", padding: 20 },
          ]}
          pointerEvents="box-none"
        >
          <View
            className="overflow-hidden rounded-2xl border border-border bg-surface"
            style={{ maxHeight: "88%" }}
          >
            <View className="flex-row items-start justify-between gap-3 px-5 pb-2 pt-5">
              <Text className="flex-1 text-lg font-semibold text-text">
                {title}
              </Text>
              {dismissible && (
                <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
                  <X size={20} color={s.textMuted} />
                </Pressable>
              )}
            </View>
            {!!subtitle && (
              <Text className="px-5 pb-1 text-sm leading-snug text-text-muted">
                {subtitle}
              </Text>
            )}
            <ScrollView
              contentContainerClassName="gap-3 px-5 py-3"
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
            <View
              className="gap-2 border-t border-border px-5 py-3"
              style={{ paddingBottom: insets.bottom + 12 }}
            >
              {footer}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
