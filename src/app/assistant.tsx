import { useState } from "react";
import { Meta } from "@/components/ui/Meta";
import { EmptyState } from "@/components/ui/EmptyState";
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
  ArrowUp,
  CloudOff,
  InfinityIcon,
  Square,
  SquarePen,
  X,
} from "lucide-react-native";
import { useAssistant } from "@/hooks/useAssistant";
import { MessageList } from "@/components/assistant/MessageList";
import { PlanBadge } from "@/components/assistant/PlanBadge";
import { UsageMeter } from "@/components/assistant/UsageMeter";
import { QuickActionChips } from "@/components/assistant/QuickActionChips";
import { ActionMenu } from "@/components/assistant/ActionMenu";
import { AssistantLocked } from "@/components/assistant/AssistantLocked";
import { alpha, useThemeColors } from "@/theme/useThemeColors";
import { useOnline } from "@/lib/network";
import { IconAction } from "@/components/ui/IconAction";
import { SIZE } from "@/theme/tokens";

const MAX_INPUT_CHARS = 4000;

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
    pendingTool,
    plan,
    mode,
    actions,
    usage,
    send,
    runCanned,
    dismissHints,
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
  // Which assistant this account gets. The server decides (see
  // core/assistant/tiers.py) and ships the answer in /usage/, so there is
  // nothing to keep in sync here. `null` means we haven't heard back yet.
  const isChat = mode === "llm";
  const isCanned = mode === "canned";
  const isLocked = mode === "none";
  const isEmpty = messages.length === 0;
  const trimmed = input.trim();
  // Loop siempre necesita red: sin ella se ve el historial, pero no se envía.
  const online = useOnline();
  const canSend = !streaming && online && trimmed.length > 0;
  // "N messages left today" solo cuando hay tope diario (modo llm).
  const cap = usage?.daily_message_cap;
  const messagesLeft =
    isChat && usage && cap != null ? Math.max(0, cap - usage.messages_sent_today) : null;

  const handleSend = () => {
    if (!canSend) return;
    send(trimmed);
    setInput("");
  };

  const handlePick = (prompt: string) => {
    if (streaming) return;
    send(prompt);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["bottom"]}>
      {/* Header. Full-screen modal goes under the status bar; pad the top by the
          real safe-area inset (+8) so the close X clears the notch and stays
          tappable. We pad explicitly instead of relying on the SafeAreaView top
          edge because the modal's own host view reported a 0 inset on iOS. */}
      <View
        style={{ paddingTop: insets.top + 6, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.line[14] }}
        className="flex-row items-center pl-4 pr-2"
      >
        <View
          className="items-center justify-center rounded-full"
          style={{ width: 36, height: 36, backgroundColor: c.accent }}
        >
          <InfinityIcon size={18} color={c.bg} />
        </View>
        <View className="min-w-0 flex-1" style={{ marginLeft: 12 }}>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Text
              accessibilityRole="header"
              className="font-display"
              style={{ fontSize: 20, lineHeight: 24, letterSpacing: -0.4, color: c.text }}
            >
              {t("assistant.title")}
            </Text>
            <PlanBadge plan={plan} />
          </View>
          {/* Con tope diario (modo llm), la meta dice cuántos quedan, en
              signal. Sin tope, el subtítulo del modo. */}
          {messagesLeft != null ? (
            <Meta variant="cintillo" tone="inherit" numberOfLines={1} style={{ color: c.signal }}>
              {t("assistant.usage.left", { count: messagesLeft })}
            </Meta>
          ) : (
            <Meta tone="faint" numberOfLines={1}>
              {t(`assistant.subtitleFor.${mode ?? "none"}`)}
            </Meta>
          )}
        </View>
        <View className="flex-row" style={{ gap: 8 }}>
          <IconAction
            icon={SquarePen}
            label={t("assistant.newChat")}
            onPress={newConversation}
            disabled={streaming || isEmpty}
            tone="text"
          />
          <IconAction
            icon={X}
            label={t("assistant.close")}
            onPress={() => router.back()}
            tone="text"
            iconSize={22}
          />
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Barra de uso de 3 px: solo el tier llm tiene cupo que medir. */}
        {isChat && <UsageMeter usage={usage} />}

        {isLocked ? (
          <AssistantLocked />
        ) : isEmpty ? (
          <View className="flex-1 justify-center px-6">
            <EmptyState
              title={t("assistant.welcome.title")}
              body={t(`assistant.welcome.bodyFor.${mode ?? "canned"}`)}
            />
          </View>
        ) : (
          <MessageList
            messages={messages}
            streaming={streaming}
            pendingTool={pendingTool}
            onDismissHints={isCanned ? dismissHints : undefined}
          />
        )}

        {error && !isLocked && (
          <View
            className="mx-4 mb-2 flex-row items-center gap-2 rounded-lg border px-3 py-2"
            style={{
              backgroundColor: alpha(c.signal, 0.1),
              borderColor: alpha(c.signal, 0.3),
            }}
          >
            <AlertCircle size={14} color={c.signal} />
            <Text className="font-sans flex-1 text-xs" style={{ color: c.signal }}>
              {error}
            </Text>
          </View>
        )}

        {!online && !isLocked && (
          <View className="mx-4 mb-2 flex-row items-center gap-2 rounded-lg border border-border px-3 py-2">
            <CloudOff size={14} color={c.text3} />
            <Text className="font-sans flex-1 text-xs text-text-muted">
              {t("offline.needsConnection")}
            </Text>
          </View>
        )}

        {isChat && isEmpty && (
          <QuickActionChips onPick={handlePick} disabled={streaming || !online} />
        )}

        {isCanned && (
          <ActionMenu groups={actions} onRun={runCanned} disabled={streaming || !online} />
        )}

        {/*
          There used to be a "deep mode" toggle here. It is gone on purpose:
          which model answers now depends on an admin switch and the
          account's remaining budget, both server-side. A button that is
          sometimes honoured and sometimes silently ignored — which is what
          it became once the daily cap ran out — is worse than no button.
        */}

        {/* Input row — chat tier only; `canned` composes with ActionMenu. */}
        {isChat && (
          <View
            className="flex-row items-end px-4"
            style={{ gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line[14] }}
          >
            <TextInput
              value={input}
              onChangeText={(v) => setInput(v.slice(0, MAX_INPUT_CHARS))}
              placeholder={t("assistant.inputPlaceholder")}
              placeholderTextColor={c.text5}
              accessibilityLabel={t("assistant.inputPlaceholder")}
              multiline
              className="flex-1 rounded-lg border border-border bg-surface"
              style={{
                minHeight: SIZE.input,
                maxHeight: 128,
                paddingHorizontal: 14,
                paddingTop: 13,
                paddingBottom: 13,
                fontSize: 16,
                color: c.text,
              }}
            />
            {streaming ? (
              <Pressable
                onPress={stop}
                accessibilityRole="button"
                accessibilityLabel={t("assistant.stop")}
                className="items-center justify-center rounded-full active:opacity-70"
                style={{ width: SIZE.input, height: SIZE.input, backgroundColor: alpha(c.text, 0.12) }}
              >
                <Square size={18} color={c.text} fill={c.text} />
              </Pressable>
            ) : (
              <Pressable
                onPress={handleSend}
                disabled={!canSend}
                accessibilityRole="button"
                accessibilityLabel={t("assistant.send")}
                accessibilityState={{ disabled: !canSend }}
                className="items-center justify-center rounded-full active:opacity-70"
                style={{
                  width: SIZE.input,
                  height: SIZE.input,
                  backgroundColor: canSend ? c.accent : c.line[14],
                }}
              >
                <ArrowUp size={22} color={canSend ? c.bg : c.text3} />
              </Pressable>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
