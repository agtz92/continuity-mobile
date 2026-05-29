import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "./supabase";

// Dismisses the in-app browser when the auth redirect comes back.
WebBrowser.maybeCompleteAuthSession();

export class OAuthCancelled extends Error {
  constructor() {
    super("OAuth cancelled");
    this.name = "OAuthCancelled";
  }
}

/**
 * Google sign-in via Supabase. Supabase brokers the whole exchange; we open the
 * provider URL in an auth session and exchange the returned `?code` for a
 * session client-side (RN has no SSR cookies, so no /auth/callback round-trip
 * on the server like the web).
 *
 * NOTE: only completes in a dev build. In Expo Go `Linking.createURL` yields an
 * `exp://` URL that isn't in Supabase's allowed redirects, so the round-trip
 * won't close. Email/password works everywhere.
 */
export async function signInWithGoogle(): Promise<void> {
  const redirectTo = Linking.createURL("auth/callback");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("No OAuth URL returned");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === "cancel" || result.type === "dismiss") {
    throw new OAuthCancelled();
  }
  if (result.type !== "success" || !result.url) {
    throw new Error("OAuth flow did not complete");
  }

  const code = new URL(result.url).searchParams.get("code");
  if (!code) throw new Error("No auth code in redirect");

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
}
