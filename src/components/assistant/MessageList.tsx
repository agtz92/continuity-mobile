import { Fragment, useEffect, useRef } from "react";
import { ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { ChatMessage } from "@/hooks/useAssistant";
import { useThemeColors } from "@/theme/useThemeColors";
import { Message } from "./Message";
import { StudioHint } from "./StudioHint";
import { toolLabel } from "./ToolCallCard";

export function MessageList({
  messages,
  streaming,
  pendingTool = null,
  onDismissHints,
}: {
  messages: ChatMessage[];
  streaming: boolean;
  /** Tool the model is writing (`tool_use_pending`), if any. */
  pendingTool?: string | null;
  /** `canned` only: hides the Studio hints for this conversation. */
  onDismissHints?: () => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const scrollRef = useRef<ScrollView | null>(null);

  const last = messages[messages.length - 1];
  const lastBlocks = last && last.role === "assistant" ? last.blocks : [];
  const lastBlock = lastBlocks[lastBlocks.length - 1];
  const toolRunning =
    lastBlock?.type === "tool_use" && lastBlock.output === undefined;
  // Persistent "working" indicator. The empty-message "Thinking…" covers the
  // first gap and a running ToolCallCard shows its own state — this footer
  // fills every OTHER silent gap (between tool rounds) so the user always has a
  // sign Claude is still busy.
  const showWorking = streaming && lastBlocks.length > 0 && !toolRunning;
  // A long tool input (note bodies, prompts) can take a minute to write.
  // Naming it beats a generic "working" that looks frozen.
  const pendingLabel =
    streaming && pendingTool
      ? t("assistant.message.writing", { tool: toolLabel(pendingTool) })
      : null;

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, showWorking]);

  return (
    <ScrollView
      ref={scrollRef}
      className="flex-1"
      contentContainerClassName="gap-5 px-5 py-4"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      onContentSizeChange={() =>
        scrollRef.current?.scrollToEnd({ animated: true })
      }
    >
      {messages.map((m) => (
        <Fragment key={m.id}>
          <Message
            message={m}
            streaming={streaming && m.id === last?.id}
            pendingLabel={m.id === last?.id ? pendingLabel : null}
          />
          {m.role === "assistant" && m.hint && onDismissHints && (
            <StudioHint hint={m.hint} onDismiss={onDismissHints} />
          )}
        </Fragment>
      ))}
      {showWorking && (
        <View className="flex-row items-center gap-2">
          <View className="flex-row gap-1">
            <View
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: c.accent }}
            />
            <View
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: c.accent, opacity: 0.6 }}
            />
            <View
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: c.accent, opacity: 0.3 }}
            />
          </View>
          <Text className="font-sans text-xs text-text-muted">
            {pendingLabel ?? t("assistant.message.working")}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
