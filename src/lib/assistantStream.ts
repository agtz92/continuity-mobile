import { fetch as streamingFetch } from "react-native-fetch-api";
import { supabase } from "./supabase";
import { assistantBaseUrl } from "./assistantApi";

export type AssistantEventKind =
  | "meta"
  | "text_delta"
  | "tool_use_start"
  | "tool_result"
  | "usage"
  | "error"
  | "done";

export type AssistantEvent =
  | {
      kind: "meta";
      payload: {
        conversation_id: string;
        user_message_id: string;
        model: string;
        plan: "free" | "pro" | "studio" | "admin";
        messages_remaining_today: number | null;
      };
    }
  | { kind: "text_delta"; payload: { text: string } }
  | {
      kind: "tool_use_start";
      payload: { id: string; name: string; input: Record<string, unknown> };
    }
  | {
      kind: "tool_result";
      payload: { id: string; name: string; output: unknown };
    }
  | {
      kind: "usage";
      payload: {
        tokens_in: number;
        tokens_out: number;
        cache_read_in: number;
        cache_creation_in: number;
      };
    }
  | { kind: "error"; payload: { message: string } }
  | { kind: "done"; payload: { ok: boolean; stop_reason?: string } };

export type StreamArgs = {
  conversationId?: string;
  content: string;
  /** Opt in to the costlier Sonnet model (admin plan only). */
  deepMode?: boolean;
  signal?: AbortSignal;
  onEvent: (event: AssistantEvent) => void;
};

export class StreamHttpError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

/**
 * Parse SSE frames coming off the chat endpoint.
 * EventSource can't carry an Authorization header, so we use fetch+ReadableStream.
 */
export async function streamChat(args: StreamArgs): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not signed in");
  }

  // Native RN fetch can't stream a response body; react-native-fetch-api can
  // when `reactNative.textStreaming` is set. Scoped here so Supabase/Apollo keep
  // using the native fetch (the global one is intentionally not polyfilled).
  const res = await streamingFetch(`${assistantBaseUrl}/api/assistant/chat/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "X-Continuity-Client": "mobile",
    },
    body: JSON.stringify({
      conversation_id: args.conversationId,
      content: args.content,
      deep_mode: args.deepMode ?? false,
    }),
    signal: args.signal,
    reactNative: { textStreaming: true },
  });

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // ignore
    }
    throw new StreamHttpError(res.status, body);
  }

  if (!res.body) {
    throw new Error("No response body");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by blank lines (`\n\n`).
    let frameEnd = buffer.indexOf("\n\n");
    while (frameEnd !== -1) {
      const frame = buffer.slice(0, frameEnd);
      buffer = buffer.slice(frameEnd + 2);
      dispatch(frame, args.onEvent);
      frameEnd = buffer.indexOf("\n\n");
    }
  }
}

function dispatch(
  frame: string,
  onEvent: (event: AssistantEvent) => void,
): void {
  let kind: string | null = null;
  let dataStr = "";
  for (const line of frame.split("\n")) {
    if (line.startsWith("event: ")) {
      kind = line.slice("event: ".length).trim();
    } else if (line.startsWith("data: ")) {
      dataStr += line.slice("data: ".length);
    }
  }
  if (!kind) return;
  try {
    const payload = dataStr ? JSON.parse(dataStr) : {};
    onEvent({ kind, payload } as AssistantEvent);
  } catch (e) {
    // Ignore malformed frames.
  }
}
