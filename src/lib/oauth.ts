import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as AppleAuthentication from "expo-apple-authentication";
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
export function signInWithGoogle(): Promise<void> {
  return signInWithBrowserOAuth("google");
}

async function signInWithBrowserOAuth(provider: "google" | "apple"): Promise<void> {
  const redirectTo = Linking.createURL("auth/callback");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
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

  const url = new URL(result.url);
  const code = url.searchParams.get("code");
  if (!code) {
    // Surface Supabase's actual error if it redirected back with one, instead
    // of a generic message — saves a debug build cycle.
    const reason =
      url.searchParams.get("error_description") ??
      url.searchParams.get("error") ??
      "No auth code in redirect";
    throw new Error(reason);
  }

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
}

/**
 * Sign in with Apple. Obligatorio en iOS porque ofrecemos Google (App Store
 * Review 4.8).
 *
 * - iOS: hoja nativa (AuthenticationServices) → `identityToken` →
 *   `signInWithIdToken`. Supabase valida el token contra el bundle id
 *   `it.continuu.app`, que debe estar en "Client IDs" del provider Apple.
 * - Android: no hay API nativa; usa el mismo round-trip web que Google, con el
 *   Services ID que también usa la web.
 *
 * Apple solo entrega el nombre la PRIMERA vez que la persona autoriza la app,
 * así que se guarda en `full_name` en ese momento (el onboarding lo precarga).
 */
export async function signInWithApple(): Promise<void> {
  if (Platform.OS !== "ios") return signInWithBrowserOAuth("apple");

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (e) {
    if ((e as { code?: string })?.code === "ERR_REQUEST_CANCELED") {
      throw new OAuthCancelled();
    }
    throw e;
  }
  if (!credential.identityToken) throw new Error("No identity token from Apple");

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
  });
  if (error) throw error;

  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fullName) {
    // Best effort: si falla, el onboarding pide el nombre igual.
    await supabase.auth.updateUser({
      data: { full_name: fullName },
    });
  }
}
