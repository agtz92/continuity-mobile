import { ApolloClient, ApolloLink, InMemoryCache, HttpLink } from "@apollo/client";
import { SetContextLink } from "@apollo/client/link/context";
import { ErrorLink } from "@apollo/client/link/error";
import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";
import { supabase } from "./supabase";
import { toast } from "./toast";

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

const errorLink = new ErrorLink(({ error }) => {
  if (CombinedGraphQLErrors.is(error)) {
    let unauthenticated = false;
    for (const gqlError of error.errors) {
      if (gqlError.extensions?.code === "UNAUTHENTICATED") {
        unauthenticated = true;
      } else {
        toast.error(gqlError.message);
      }
    }
    if (unauthenticated) {
      toast.error("Your session expired. Please sign in again.");
      void supabase.auth.signOut();
    }
    return;
  }

  if (ServerError.is(error) && error.statusCode === 401) {
    toast.error("Your session expired. Please sign in again.");
    void supabase.auth.signOut();
    return;
  }

  if (error) {
    toast.error(error.message || "Network error. Please try again.");
  }
});

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});
