// Polyfills must load before anything that touches encoding/streams/crypto.
// NOT global fetch — see src/lib/polyfills.ts for why.
import "@/lib/polyfills";
import "../global.css";
import "@/lib/i18n";

import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { ApolloProvider, useQuery } from "@apollo/client/react";
import { apolloClient } from "@/lib/apollo";
import { ONBOARDING_STATE_QUERY } from "@/lib/graphql";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/Toaster";

// Keep the native splash up until the theme has hydrated from AsyncStorage and
// auth has resolved (see ThemeProvider). Prevents the "blank, then everything
// pops in — in the wrong theme" launch flash. Errors are ignored: a missed
// preventAutoHide just means the splash hides on its default schedule.
SplashScreen.preventAutoHideAsync().catch(() => {});

function ThemedStatusBar() {
  const { effective } = useTheme();
  return <StatusBar style={effective === "light" ? "dark" : "light"} />;
}

// Redirect based on auth + onboarding state once the session has resolved.
// Keeps signed-out users in (auth); routes signed-in users who haven't finished
// onboarding to /onboarding; and bounces everyone else off the splash/(auth).
function useProtectedRoute() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Onboarding status only matters once signed in. cache-and-network gives an
  // instant decision from cache while refreshing in the background.
  const { data: onb, loading: onbLoading } = useQuery<{
    onboardingState: { status: string } | null;
  }>(ONBOARDING_STATE_QUERY, {
    skip: !session,
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    const onSplash = (segments as string[]).length === 0;
    const onOnboarding = segments[0] === "onboarding";

    if (!session) {
      if (!inAuthGroup) router.replace("/login");
      return;
    }

    // Signed in. Wait for the first onboarding result before deciding so we
    // don't flash the dashboard for a brand-new user who needs onboarding.
    if (onbLoading && !onb) return;
    const status = onb?.onboardingState?.status;
    const needsOnboarding = status === "not_started" || status === "in_progress";

    if (needsOnboarding) {
      // Route into onboarding, but don't fight a user who is already there
      // (e.g. replaying their setup).
      if (!onOnboarding) router.replace("/onboarding");
      return;
    }

    // Onboarding done (or backend has no opinion): keep them out of splash/auth.
    // /onboarding is left reachable so the replay entry works.
    if (inAuthGroup || onSplash) {
      router.replace("/today");
    }
  }, [session, loading, segments, router, onb, onbLoading]);
}

function RootNavigator() {
  useProtectedRoute();
  return (
    <>
      <ThemedStatusBar />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(modals)" options={{ presentation: "modal" }} />
        <Stack.Screen
          name="assistant"
          options={{ presentation: "fullScreenModal" }}
        />
      </Stack>
      <Toaster />
    </>
  );
}

export default function RootLayout() {
  // SafeAreaProvider must wrap the tree so SafeAreaView/useSafeAreaInsets report
  // real insets everywhere — including the assistant's fullScreenModal, which
  // renders in its own host view and otherwise saw 0 top inset (the close X
  // landed under the notch and was untappable). initialWindowMetrics gives the
  // correct inset on the very first frame, avoiding a flash of mis-padded UI.
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ApolloProvider client={apolloClient}>
        <AuthProvider>
          <ThemeProvider>
            <RootNavigator />
          </ThemeProvider>
        </AuthProvider>
      </ApolloProvider>
    </SafeAreaProvider>
  );
}
