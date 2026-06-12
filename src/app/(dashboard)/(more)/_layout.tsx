import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/ThemeProvider";
import { THEME_SURFACES } from "@/theme/tokens";
import { HeaderBackButton } from "@/components/ui/HeaderBackButton";

export default function MoreLayout() {
  const { t } = useTranslation();
  const { effective } = useTheme();
  const s = THEME_SURFACES[effective];

  const headered = {
    headerShown: true,
    headerStyle: { backgroundColor: s.surface },
    headerTintColor: s.text,
    headerTitleStyle: { color: s.text },
    headerShadowVisible: false,
    // Explicit, clearly-visible back arrow — the default native chevron was
    // too subtle and users couldn't tell the header was tappable.
    headerBackVisible: false,
    headerLeft: (props: { canGoBack?: boolean }) => (
      <HeaderBackButton canGoBack={props.canGoBack} />
    ),
  } as const;

  return (
    <Stack initialRouteName="more">
      <Stack.Screen name="more" options={{ headerShown: false }} />
      <Stack.Screen name="ideas" options={{ ...headered, title: t("tabs.ideas") }} />
      <Stack.Screen
        name="quick-notes"
        options={{ ...headered, title: t("tabs.notes") }}
      />
      <Stack.Screen
        name="quick-note"
        options={{ ...headered, title: t("views.quickNotes.noteTitle") }}
      />
      <Stack.Screen name="log" options={{ ...headered, title: t("tabs.log") }} />
      <Stack.Screen
        name="analytics"
        options={{ ...headered, title: t("tabs.analytics") }}
      />
      <Stack.Screen
        name="appearance"
        options={{ ...headered, title: t("settings.appearance.title") }}
      />
      <Stack.Screen
        name="profile"
        options={{ ...headered, title: t("settings.nav.profile") }}
      />
      <Stack.Screen
        name="notifications"
        options={{ ...headered, title: t("settings.nav.notifications") }}
      />
      <Stack.Screen
        name="billing"
        options={{ ...headered, title: t("settings.nav.billing") }}
      />
      <Stack.Screen
        name="plugins"
        options={{ ...headered, title: t("settings.nav.plugins") }}
      />
      <Stack.Screen
        name="google-tasks"
        options={{ ...headered, title: t("settings.plugins.googleTasks.title") }}
      />
      <Stack.Screen
        name="report-bug"
        options={{ ...headered, title: t("reportBug.title") }}
      />
    </Stack>
  );
}
