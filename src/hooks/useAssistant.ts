import { useCallback, useEffect, useRef, useState } from "react";
import i18n from "@/lib/i18n";
import {
  cancelConversation,
  getUsage,
  type UsageSnapshot,
} from "@/lib/assistantApi";
import {
  streamChat,
  StreamHttpError,
  type AssistantEvent,
} from "@/lib/assistantStream";

export type AssistantTextBlock = { type: "text"; text: string };
export type AssistantToolUseBlock = {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
};
export type AssistantBlock = AssistantTextBlock | AssistantToolUseBlock;

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; blocks: AssistantBlock[] };

export type AssistantState = {
  messages: ChatMessage[];
  conversationId: string | null;
  streaming: boolean;
  error: string | null;
  plan: "free" | "pro" | "studio" | "admin";
  usage: UsageSnapshot | null;
};

const INITIAL: AssistantState = {
  messages: [],
  conversationId: null,
  streaming: false,
  error: null,
  plan: "free",
  usage: null,
};

export function useAssistant() {
  const [state, setState] = useState<AssistantState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const refreshUsage = useCallback(async () => {
    try {
      const snap = await getUsage();
      setState((s) => ({ ...s, usage: snap, plan: snap.plan }));
    } catch {
      /* swallow */
    }
  }, []);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  const send = useCallback(
    async (content: string, deepMode = false) => {
      if (state.streaming) return;
      const trimmed = content.trim();
      if (!trimmed) return;

      const userId = `local-${Date.now()}`;
      setState((s) => ({
        ...s,
        streaming: true,
        error: null,
        messages: [
          ...s.messages,
          { id: userId, role: "user", text: trimmed },
          { id: `${userId}-pending`, role: "assistant", blocks: [] },
        ],
      }));

      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const assistantBlocks: AssistantBlock[] = [];

      const append = (block: AssistantBlock) => {
        assistantBlocks.push(block);
        setState((s) => ({
          ...s,
          messages: replaceLastAssistant(s.messages, [...assistantBlocks]),
        }));
      };

      try {
        await streamChat({
          conversationId: state.conversationId ?? undefined,
          content: trimmed,
          deepMode,
          signal: ctrl.signal,
          onEvent: (event: AssistantEvent) => {
            if (event.kind === "meta") {
              setState((s) => ({
                ...s,
                conversationId: event.payload.conversation_id,
                plan: event.payload.plan,
              }));
            } else if (event.kind === "text_delta") {
              const last = assistantBlocks[assistantBlocks.length - 1];
              if (last?.type === "text") {
                last.text += event.payload.text;
                setState((s) => ({
                  ...s,
                  messages: replaceLastAssistant(s.messages, [
                    ...assistantBlocks,
                  ]),
                }));
              } else {
                append({ type: "text", text: event.payload.text });
              }
            } else if (event.kind === "tool_use_start") {
              append({
                type: "tool_use",
                id: event.payload.id,
                name: event.payload.name,
                input: event.payload.input,
              });
            } else if (event.kind === "tool_result") {
              const block = assistantBlocks.find(
                (b) => b.type === "tool_use" && b.id === event.payload.id,
              ) as AssistantToolUseBlock | undefined;
              if (block) {
                block.output = event.payload.output;
                setState((s) => ({
                  ...s,
                  messages: replaceLastAssistant(s.messages, [
                    ...assistantBlocks,
                  ]),
                }));
              }
            } else if (event.kind === "error") {
              setState((s) => ({ ...s, error: event.payload.message }));
            }
          },
        });
      } catch (err) {
        if (ctrl.signal.aborted) {
          setState((s) => ({ ...s, error: i18n.t("assistant.errors.stopped") }));
        } else if (err instanceof StreamHttpError) {
          const body = err.body as { error?: string; kind?: string } | null;
          if (err.status === 429) {
            setState((s) => ({
              ...s,
              error:
                body?.kind === "daily_messages"
                  ? i18n.t("assistant.errors.dailyLimit")
                  : body?.error || i18n.t("assistant.errors.rateLimit"),
            }));
          } else if (err.status === 413) {
            setState((s) => ({
              ...s,
              error: body?.error || i18n.t("assistant.errors.tooLong"),
            }));
          } else if (err.status === 401) {
            setState((s) => ({
              ...s,
              error: i18n.t("assistant.errors.sessionExpired"),
            }));
          } else {
            setState((s) => ({ ...s, error: body?.error || err.message }));
          }
        } else {
          setState((s) => ({
            ...s,
            error: (err as Error).message || i18n.t("assistant.errors.unknown"),
          }));
        }
      } finally {
        abortRef.current = null;
        setState((s) => ({ ...s, streaming: false }));
        refreshUsage();
      }
    },
    [state.streaming, state.conversationId, refreshUsage],
  );

  const stop = useCallback(async () => {
    const ctrl = abortRef.current;
    if (ctrl) ctrl.abort();
    if (state.conversationId) {
      try {
        await cancelConversation(state.conversationId);
      } catch {
        /* swallow */
      }
    }
  }, [state.conversationId]);

  const newConversation = useCallback(() => {
    if (state.streaming) return;
    setState((s) => ({
      ...s,
      messages: [],
      conversationId: null,
      error: null,
    }));
  }, [state.streaming]);

  return { ...state, send, stop, newConversation, refreshUsage };
}

function replaceLastAssistant(
  messages: ChatMessage[],
  blocks: AssistantBlock[],
): ChatMessage[] {
  const out = [...messages];
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i].role === "assistant") {
      out[i] = { ...out[i], blocks } as ChatMessage;
      break;
    }
  }
  return out;
}
