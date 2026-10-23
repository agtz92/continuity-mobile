import { useCallback, useEffect, useRef, useState } from "react";
import { useApolloClient } from "@apollo/client/react";
import i18n from "@/lib/i18n";
import { DASHBOARD_QUERY } from "@/lib/graphql";
import {
  cancelConversation,
  getActions,
  getMessages,
  getUsage,
  runAction,
  type AssistantMode,
  type CannedGroup,
  type StoredMessage,
  type StudioHint,
  type UsageSnapshot,
} from "@/lib/assistantApi";
import {
  streamChat,
  StreamCutError,
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
  | {
      id: string;
      role: "assistant";
      blocks: AssistantBlock[];
      /** `canned` only: what Studio would do with this answer. Not stored. */
      hint?: StudioHint;
    };

export type AssistantState = {
  messages: ChatMessage[];
  conversationId: string | null;
  streaming: boolean;
  error: string | null;
  /**
   * The last turn's stream closed before `done`. The thread has been
   * reloaded from the server, so what is shown is what actually ran.
   */
  connectionCut: boolean;
  /**
   * Tool the model is writing right now (`tool_use_pending`). Its input can
   * take a minute to arrive; the UI says "writing…" instead of freezing.
   */
  pendingTool: string | null;
  plan: "free" | "pro" | "studio" | "admin";
  /**
   * Which assistant this account gets. Comes from the server so the rule
   * lives in one place; `null` until the first usage fetch resolves.
   */
  mode: AssistantMode | null;
  /** Populated only in `canned` mode. */
  actions: CannedGroup[];
  /**
   * Studio hints already shown in this conversation, by action id. One per
   * action per conversation: the second "what's overdue" doesn't need the
   * same pitch twice.
   */
  hintedActions: string[];
  /** The user hid the hints; none come back until a new conversation. */
  hintsDismissed: boolean;
  usage: UsageSnapshot | null;
};

const INITIAL: AssistantState = {
  messages: [],
  conversationId: null,
  streaming: false,
  error: null,
  connectionCut: false,
  pendingTool: null,
  plan: "free",
  mode: null,
  actions: [],
  hintedActions: [],
  hintsDismissed: false,
  usage: null,
};

/**
 * El modo del asistente, con respaldo cuando el servidor no lo manda.
 *
 * `assistant_mode` es la fuente de verdad (backend `core/assistant/tiers.py`) y
 * hay que leerla, no deducirla. Pero **ausente no puede significar bloqueado**:
 * un backend viejo, un despliegue a medias o una respuesta cacheada dejaban a
 * un usuario de Studio —que paga— mirando un cartel de "disponible en planes
 * superiores", sin composer y sin forma de entender por qué.
 *
 * Así que si el campo no viene, se deduce del plan con el mismo mapa que usa el
 * servidor. Si el cliente se equivoca de más, el backend responde 403
 * `plan_required` y el error se ve; equivocarse de menos deja a alguien sin lo
 * que pagó, en silencio. Es la dirección segura en la que fallar.
 */
function resolveMode(snap: UsageSnapshot): AssistantMode {
  if (snap.assistant_mode) return snap.assistant_mode;
  if (snap.plan === "studio" || snap.plan === "admin") return "llm";
  if (snap.plan === "pro") return "canned";
  return "none";
}

export function useAssistant() {
  const [state, setState] = useState<AssistantState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);
  const usedToolRef = useRef(false);
  const apollo = useApolloClient();

  const refreshUsage = useCallback(async () => {
    try {
      const snap = await getUsage();
      const mode = resolveMode(snap);
      setState((s) => ({ ...s, usage: snap, plan: snap.plan, mode }));
      return mode;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    // The catalogue only exists for `canned`, and asking for it in any
    // other mode is a guaranteed 403 — so resolve the mode first.
    (async () => {
      const mode = await refreshUsage();
      if (mode !== "canned") return;
      try {
        const groups = await getActions();
        setState((s) => ({ ...s, actions: groups }));
      } catch {
        /* the screen falls back to an empty catalogue */
      }
    })();
  }, [refreshUsage]);

  const send = useCallback(
    async (content: string) => {
      if (state.streaming) return;
      const trimmed = content.trim();
      if (!trimmed) return;

      const userId = `local-${Date.now()}`;
      usedToolRef.current = false;
      setState((s) => ({
        ...s,
        streaming: true,
        error: null,
        connectionCut: false,
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
          signal: ctrl.signal,
          onEvent: (event: AssistantEvent) => {
            if (event.kind === "tool_use_pending") {
              const name = event.payload.name;
              setState((s) => ({ ...s, pendingTool: name }));
              return;
            }
            if (event.kind === "text_delta" || event.kind === "tool_use_start") {
              setState((s) =>
                s.pendingTool === null ? s : { ...s, pendingTool: null },
              );
            }
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
              usedToolRef.current = true;
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
        } else if (err instanceof StreamCutError) {
          // The proxy or the network dropped the turn. The server persists
          // every message as it happens, so reload the thread instead of
          // trusting the half-painted bubble — and assume tools ran.
          usedToolRef.current = true;
          setState((s) => ({
            ...s,
            connectionCut: true,
            error: i18n.t("assistant.errors.connectionCut"),
          }));
          const convId = err.conversationId ?? state.conversationId;
          if (convId) {
            try {
              const stored = await getMessages(convId);
              setState((s) => ({
                ...s,
                conversationId: convId,
                messages: storedToChat(stored.messages),
              }));
            } catch {
              /* keep what was painted; the error already says it was cut */
            }
          }
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
          } else if (err.status === 403) {
            // The plan changed under us (downgrade, expiry). Re-read the
            // mode so the screen switches to the right assistant instead
            // of showing a composer that can only fail.
            setState((s) => ({
              ...s,
              error: body?.error || i18n.t("assistant.errors.planRequired"),
            }));
            refreshUsage();
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
        setState((s) => ({ ...s, streaming: false, pendingTool: null }));
        refreshUsage();
        // The assistant runs tools server-side that can create/update/delete
        // projects, tasks, ideas, routines, etc. — none of which go through
        // Apollo on the client. Refetch the dashboard so anything the AI
        // touched shows up the moment the user navigates back.
        if (usedToolRef.current) {
          usedToolRef.current = false;
          apollo
            .refetchQueries({ include: [DASHBOARD_QUERY] })
            .catch(() => undefined);
        }
      }
    },
    [state.streaming, state.conversationId, refreshUsage, apollo],
  );

  /**
   * Run one catalogue action (the `canned` tier). Not a variant of `send`:
   * there is no stream, no model and nothing to cancel — a question, a
   * query, an answer. The user's side of the thread is the action's own
   * label, so the transcript reads like a conversation.
   */
  const runCanned = useCallback(
    async (actionId: string, label: string, query = "") => {
      if (state.streaming) return;
      const localId = `local-${Date.now()}`;
      setState((s) => ({
        ...s,
        streaming: true,
        error: null,
        messages: [
          ...s.messages,
          { id: localId, role: "user", text: label },
          { id: `${localId}-pending`, role: "assistant", blocks: [] },
        ],
      }));

      try {
        const answer = await runAction(actionId, {
          conversationId: state.conversationId ?? undefined,
          query,
        });
        setState((s) => {
          const messages = replaceLastAssistant(
            s.messages,
            answer.content.map((b) => ({ type: "text" as const, text: b.text })),
          );
          const hint =
            answer.studio_hint &&
            !s.hintsDismissed &&
            !s.hintedActions.includes(actionId)
              ? answer.studio_hint
              : null;
          return {
            ...s,
            conversationId: answer.conversation_id,
            messages: hint ? attachHint(messages, hint) : messages,
            hintedActions: hint
              ? [...s.hintedActions, actionId]
              : s.hintedActions,
          };
        });
      } catch (err) {
        setState((s) => ({
          ...s,
          error: (err as Error).message || i18n.t("assistant.errors.unknown"),
        }));
      } finally {
        setState((s) => ({ ...s, streaming: false }));
      }
    },
    [state.streaming, state.conversationId],
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
      connectionCut: false,
      hintedActions: [],
      hintsDismissed: false,
    }));
  }, [state.streaming]);

  /** Hide every Studio hint in this conversation, and stop adding new ones. */
  const dismissHints = useCallback(() => {
    setState((s) => ({
      ...s,
      hintsDismissed: true,
      messages: s.messages.map((m) =>
        m.role === "assistant" && m.hint ? { ...m, hint: undefined } : m,
      ),
    }));
  }, []);

  return {
    ...state,
    send,
    runCanned,
    dismissHints,
    stop,
    newConversation,
    refreshUsage,
  };
}

function attachHint(messages: ChatMessage[], hint: StudioHint): ChatMessage[] {
  const out = [...messages];
  for (let i = out.length - 1; i >= 0; i--) {
    const m = out[i];
    if (m.role === "assistant") {
      out[i] = { ...m, hint };
      break;
    }
  }
  return out;
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

/**
 * Rebuild the chat from the server's stored rows. One bubble per turn, as
 * the live stream paints it: every assistant row up to the next user row
 * folds into a single assistant message, and `tool` rows (tool_result
 * blocks) fill in the `output` of the tool_use they answer.
 */
export function storedToChat(rows: StoredMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  let current: { id: string; role: "assistant"; blocks: AssistantBlock[] } | null =
    null;
  const blocksOf = (content: unknown): Record<string, unknown>[] =>
    Array.isArray(content)
      ? (content as Record<string, unknown>[])
      : typeof content === "string"
        ? [{ type: "text", text: content }]
        : [];

  for (const row of rows) {
    if (row.role === "user") {
      current = null;
      const text = blocksOf(row.content)
        .filter((b) => b.type === "text")
        .map((b) => String(b.text ?? ""))
        .join("");
      out.push({ id: row.id, role: "user", text });
      continue;
    }
    if (!current) {
      current = { id: row.id, role: "assistant", blocks: [] };
      out.push(current);
    }
    for (const b of blocksOf(row.content)) {
      if (row.role === "assistant" && b.type === "text") {
        current.blocks.push({ type: "text", text: String(b.text ?? "") });
      } else if (row.role === "assistant" && b.type === "tool_use") {
        current.blocks.push({
          type: "tool_use",
          id: String(b.id),
          name: String(b.name),
          input: (b.input as Record<string, unknown>) ?? {},
        });
      } else if (row.role === "tool" && b.type === "tool_result") {
        const target = current.blocks.find(
          (x) => x.type === "tool_use" && x.id === b.tool_use_id,
        ) as AssistantToolUseBlock | undefined;
        if (target) target.output = parseToolOutput(b.content);
      }
    }
  }
  return out;
}

function parseToolOutput(content: unknown): unknown {
  if (typeof content !== "string") return content ?? null;
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}
