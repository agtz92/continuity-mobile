import { ApolloClient, ApolloLink, InMemoryCache, HttpLink } from "@apollo/client";
import { SetContextLink } from "@apollo/client/link/context";
import { ErrorLink } from "@apollo/client/link/error";
import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";
import { supabase } from "./supabase";
import { toast } from "./toast";
import i18n from "./i18n";

const graphqlUrl = process.env.EXPO_PUBLIC_GRAPHQL_URL;

if (!graphqlUrl) {
  throw new Error("Missing EXPO_PUBLIC_GRAPHQL_URL");
}

// `X-Continuity-Client` lets the backend attribute interactions to a channel
// (web vs mobile) for admin metrics. Bucketing only — never used for authz.
const httpLink = new HttpLink({
  uri: graphqlUrl,
  headers: { "X-Continuity-Client": "mobile" },
});

const authLink = new SetContextLink(async (prevContext) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    headers: {
      ...prevContext.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});

// All user-facing copy is localized via the global i18n instance (usable
// outside React). Transient server/connection hiccups — `DB_UNAVAILABLE` from
// the backend, 5xx, or a stale pooled connection after the app sat backgrounded
// for days ("server closed the connection unexpectedly") — show a localized
// retry message and, critically, do NOT sign the user out.
const errorLink = new ErrorLink(({ error }) => {
  if (CombinedGraphQLErrors.is(error)) {
    let unauthenticated = false;
    for (const gqlError of error.errors) {
      const code = gqlError.extensions?.code;
      if (code === "UNAUTHENTICATED") {
        unauthenticated = true;
      } else if (code === "DB_UNAVAILABLE") {
        toast.error(i18n.t("errors.connectionLost"));
      } else if (gqlError.message) {
        // App-level errors carry a human message from the backend.
        toast.error(gqlError.message);
      } else {
        toast.error(i18n.t("errors.generic"));
      }
    }
    if (unauthenticated) {
      toast.error(i18n.t("errors.unauthenticated"));
      void supabase.auth.signOut();
    }
    return;
  }

  if (ServerError.is(error) && error.statusCode === 401) {
    toast.error(i18n.t("errors.unauthenticated"));
    void supabase.auth.signOut();
    return;
  }

  if (error) {
    // 5xx, or a reachability failure (offline / DNS / connection reset) — all
    // transient. Show the localized retry message, never raw transport text.
    toast.error(i18n.t("errors.connectionLost"));
  }
});

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});
