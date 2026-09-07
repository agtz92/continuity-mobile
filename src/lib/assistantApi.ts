import { supabase } from "./supabase";

// Reuse EXPO_PUBLIC_GRAPHQL_URL's host since the assistant lives on the
// same backend. Strip /graphql/ to get the base URL.
const baseFromGraphql = (() => {
  const url = process.env.EXPO_PUBLIC_GRAPHQL_URL;
  if (!url) return null;
  return url.replace(/\/graphql\/?$/, "");
})();

export const assistantBaseUrl =
  baseFromGraphql || "https://continuity-backend.onrender.com";

async function authHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not signed in");
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
    "X-Continuity-Client": "mobile",
  };
}

export type UsageSnapshot = {
  plan: "free" | "pro" | "studio" | "admin";
  messages_sent_today: number;
  daily_message_cap: number | null;
  tokens_used_month: number;
  monthly_token_cap: number | null;
  reset_at: string;
  is_billing_exempt: boolean;
  has_subscription: boolean;
  plan_renews_at: string | null;
  had_retention_offer: boolean;
  subscription_period: "monthly" | "annual" | null;
  cancel_at_period_end: boolean;
  /** Which channel sold the current plan. "" for free and exempt accounts. */
  billing_source: "" | "web" | "apple" | "google";
  /**
   * True for every paid source, web included: nobody's subscription is ours
   * to change any more. Replaced `store_managed`, which was true only for
   * Apple and Google.
   */
  externally_managed: boolean;
  /**
   * Where to send this person to manage their plan, or null when there is
   * nothing to manage. Resolved by the server so web and mobile can't drift.
   */
  manage_url: string | null;
};

export async function getUsage(): Promise<UsageSnapshot> {
  const headers = await authHeaders();
  const res = await fetch(`${assistantBaseUrl}/api/assistant/usage/`, {
    headers,
  });
  if (!res.ok) {
    throw new Error(`usage failed: ${res.status}`);
  }
  return res.json();
}

export type ConversationListItem = {
  id: string;
  title: string;
  updated_at: string;
};

export async function listConversations(): Promise<ConversationListItem[]> {
  const headers = await authHeaders();
  const res = await fetch(`${assistantBaseUrl}/api/assistant/conversations/`, {
    headers,
  });
  if (!res.ok) {
    throw new Error(`listConversations failed: ${res.status}`);
  }
  const body = await res.json();
  return body.conversations || [];
}

export type StoredMessage = {
  id: string;
  role: "user" | "assistant" | "tool";
  content: unknown;
  model: string;
  created: string;
};

export async function getMessages(conversationId: string): Promise<{
  id: string;
  title: string;
  messages: StoredMessage[];
}> {
  const headers = await authHeaders();
  const res = await fetch(
    `${assistantBaseUrl}/api/assistant/conversations/${conversationId}/messages/`,
    { headers },
  );
  if (!res.ok) {
    throw new Error(`getMessages failed: ${res.status}`);
  }
  return res.json();
}

export async function cancelConversation(
  conversationId: string,
): Promise<void> {
  const headers = await authHeaders();
  await fetch(`${assistantBaseUrl}/api/assistant/cancel/`, {
    method: "POST",
    headers,
    body: JSON.stringify({ conversation_id: conversationId }),
  });
}
