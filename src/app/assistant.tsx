import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Brain,
  Plus,
  Send,
  Sparkles,
  Square,
  X,
} from "lucide-react-native";
import { useAssistant } from "@/hooks/useAssistant";
import { MessageList } from "@/components/assistant/MessageList";
import { PlanBadge } from "@/components/assistant/PlanBadge";
import { UsageMeter } from "@/components/assistant/UsageMeter";
import { QuickActionChips } from "@/components/assistant/QuickActionChips";
import { alpha, useThemeColors } from "@/theme/useThemeColors";

const MAX_INPUT_CHARS = 4000;
const AMBER = "245,158,11";
const AMBER_T = "rgb(251,191,36)";

export default function AssistantScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ prompt?: string }>();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const {
    messages,
    streaming,
    error,
    plan,
    usage,
    send,
    stop,
    newConversation,
  } = useAssistant();

  // Seed the input from a `prompt` route param exactly once on mount (e.g. from
  // the Graveyard "Ask Loop to go deeper" action). The useState initializer runs
  // a single time, so this never clobbers later edits. We pre-fill the text
  // input rather than auto-send so the user can review/edit before sending.
  const [input, setInput] = useState(() => {
    const p = Array.isArray(params.prompt) ? params.prompt[0] : params.prompt;
    return (p ?? "").slice(0, MAX_INPUT_CHARS);
  });
  const [deepMode, setDeepMode] = useState(false);

  const canWrite = plan !== "free";
  const canDeep = plan === "studio" || plan === "admin";
  const isEmpty = messages.length === 0;
  const trimmed = input.trim();
  const canSend = !streaming && trimmed.length > 0;

  const handleSend = () => {
    if (!canSend) return;
    send(trimmed, deepMode);
    setInput("");
  };

  const handlePick = (prompt: string) => {
    if (streaming) return;
    send(prompt, deepMode);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["bottom"]}>
      {/* Header. Full-screen modal goes under the status bar; pad the top by the
          real safe-area inset (+8) so the close X clears the notch and stays
          tappable. We pad explicitly instead of relying on the SafeAreaView top
          edge because the modal's own host view reported a 0 inset on iOS. */}
      <View
        style={{ paddingTop: insets.top + 8 }}
        className="flex-row items-center gap-2 border-b border-border px-4 pb-3"
      >
        <View
          className="h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: c.accent }}
        >
          <Sparkles size={16} color={c.bg} />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-semibold text-text">
              {t("assistant.title")}
            </Text>
            <PlanBadge plan={plan} />
          </View>
          <Text className="text-xs text-text-muted" numberOfLines={1}>
            {t(canWrite ? "assistant.subtitleReadWrite" : "assistant.subtitle")}
          </Text>
        </View>
        <Pressable
          onPress={newConversation}
          disabled={streaming || isEmpty}
          accessibilityRole="button"
          accessibilityLabel={t("assistant.newChat")}
          hitSlop={8}
          className="rounded-lg border border-border p-2"
          style={streaming || isEmpty ? { opacity: 0.4 } : undefined}
        >
          <Plus size={18} color={c.text} />
        </Pressable>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t("assistant.close")}
          hitSlop={8}
          className="rounded-lg border border-border p-2"
        >
          <X size={18} color={c.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <UsageMeter usage={usage} />

        {isEmpty ? (
          <View className="flex-1 items-center justify-center gap-3 px-8">
            <View
              className="h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: alpha(c.accent, 0.15) }}
            >
              <Sparkles size={26} color={c.accent} />
            </View>
            <Text className="text-center text-lg font-semibold text-text">
              {t("assistant.welcome.title")}
            </Text>
            <Text className="text-center text-sm text-text-muted">
              {t(
                canWrite
                  ? "assistant.welcome.bodyReadWrite"
                  : "assistant.welcome.body",
              )}
            </Text>
          </View>
        ) : (
          <MessageList messages={messages} streaming={streaming} />
        )}

        {error && (
          <View
            className="mx-4 mb-2 flex-row items-center gap-2 rounded-lg border px-3 py-2"
            style={{
              backgroundColor: `rgba(${AMBER},0.1)`,
              borderColor: `rgba(${AMBER},0.3)`,
            }}
          >
            <AlertCircle size={14} color={AMBER_T} />
            <Text className="flex-1 text-xs" style={{ color: AMBER_T }}>
              {error}
            </Text>
          </View>
        )}

        {isEmpty && (
          <QuickActionChips onPick={handlePick} disabled={streaming} />
        )}

        {canDeep && (
          <Pressable
            onPress={() => setDeepMode((d) => !d)}
            accessibilityRole="switch"
            accessibilityState={{ checked: deepMode }}
            className="mx-4 mb-2 flex-row items-center gap-2 self-start rounded-full border px-3 py-1.5"
            style={{
              backgroundColor: deepMode ? alpha(c.accent, 0.15) : "transparent",
              borderColor: deepMode ? alpha(c.accent, 0.4) : c.border,
            }}
          >
            <Brain size={13} color={deepMode ? c.accent : c.textMuted} />
            <Text
              className="text-xs font-medium"
              style={{ color: deepMode ? c.accent : c.textMuted }}
            >
              {t("assistant.deepMode")}
            </Text>
          </Pressable>
        )}

        {/* Input row */}
        <View className="flex-row items-end gap-2 border-t border-border px-4 py-3">
          <TextInput
            value={input}
            onChangeText={(v) => setInput(v.slice(0, MAX_INPUT_CHARS))}
            placeholder={t("assistant.inputPlaceholder")}
            placeholderTextColor={c.textMuted}
            multiline
            className="max-h-32 flex-1 rounded-2xl border border-border bg-surface px-4 py-2.5 text-text"
          />
          {streaming ? (
            <Pressable
              onPress={stop}
              accessibilityRole="button"
              accessibilityLabel={t("assistant.stop")}
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: alpha(c.text, 0.12) }}
            >
              <Square size={18} color={c.text} fill={c.text} />
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel={t("assistant.send")}
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: canSend ? c.accent : c.border }}
            >
              <Send size={18} color={canSend ? c.bg : c.textMuted} />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
