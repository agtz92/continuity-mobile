import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/ThemeProvider";
import { THEME_SURFACES } from "@/theme/tokens";
import { headerOptionsFor } from "@/components/ui/HeaderBackButton";

export default function MoreLayout() {
  const { t } = useTranslation();
  const { effective } = useTheme();
  const s = THEME_SURFACES[effective];

  const headered = headerOptionsFor(s);

  return (
    <Stack initialRouteName="more">
      <Stack.Screen name="more" options={{ headerShown: false }} />
      <Stack.Screen
        name="calendar"
        options={{ ...headered, title: t("tabs.calendar") }}
      />
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
        name="graveyard"
        options={{ ...headered, title: t("views.graveyard.title") }}
      />
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

// `expo-router` monta esto en vez de dejar el hueco en blanco cuando una
// pantalla de este árbol revienta al renderizar. Ver `ui/RouteError`.
export { RouteError as ErrorBoundary } from "@/components/ui/RouteError";
