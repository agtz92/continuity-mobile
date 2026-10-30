import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    // Pinned to the project-ref key: the default derives from the URL host,
    // and pointing EXPO_PUBLIC_SUPABASE_URL at auth.continuu.it would rename
    // it and log every user out.
    storageKey: "sb-mhvmliwlhavjpdgpdzss-auth-token",
    autoRefreshToken: true,
    persistSession: true,
    // PKCE so signInWithOAuth returns `?code=` (exchanged via
    // exchangeCodeForSession) instead of the implicit flow's `#access_token`
    // fragment, which has no code for oauth.ts to read. Web uses @supabase/ssr
    // (PKCE by default); the RN client must opt in explicitly.
    flowType: "pkce",
    // RN has no URL bar; OAuth redirects are handled manually, not parsed here.
    detectSessionInUrl: false,
  },
});
