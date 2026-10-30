import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/ThemeProvider";
import { THEME_SURFACES } from "@/theme/tokens";
import { headerOptionsFor } from "@/components/ui/HeaderBackButton";

export default function MoreLayout() {
  const { t } = useTranslation();
  const { effective } = useTheme();
  const s = THEME_SURFACES[effective];

  // Atrás dice adónde lleva: casi todo vuelve a "More". Las pantallas `bare`
  // abren con su propio titular, así que la cabecera no repite el título.
  const more = t("tabs.more");
  const headered = headerOptionsFor(s, { backLabel: more });
  const bare = headerOptionsFor(s, { backLabel: more, bare: true });

  return (
    <Stack initialRouteName="more">
      <Stack.Screen name="more" options={{ headerShown: false }} />
      <Stack.Screen
        name="calendar"
        options={{ ...bare, title: t("tabs.calendar") }}
      />
      <Stack.Screen name="ideas" options={{ ...bare, title: t("tabs.ideas") }} />
      <Stack.Screen
        name="plans"
        options={{ ...headered, title: t("plans.title") }}
      />
      <Stack.Screen
        name="quick-notes"
        options={{ ...bare, title: t("tabs.notes") }}
      />
      <Stack.Screen
        name="quick-note"
        options={{
          ...headerOptionsFor(s, { backLabel: t("tabs.notes"), bare: true }),
          title: t("views.quickNotes.noteTitle"),
        }}
      />
      <Stack.Screen name="log" options={{ ...bare, title: t("tabs.log") }} />
      <Stack.Screen
        name="graveyard"
        options={{ ...bare, title: t("views.graveyard.title") }}
      />
      <Stack.Screen
        name="analytics"
        options={{ ...bare, title: t("tabs.analytics") }}
      />
      <Stack.Screen
        name="appearance"
        options={{ ...bare, title: t("settings.appearance.title") }}
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
        options={{ ...headerOptionsFor(s, { backLabel: t("settings.nav.plugins") }), title: t("settings.plugins.googleTasks.title") }}
      />
      <Stack.Screen
        name="report-bug"
        options={{ ...headered, title: t("reportBug.title") }}
      />
      <Stack.Screen
        name="unsaved"
        options={{ ...headered, title: t("offline.failed.title") }}
      />
    </Stack>
  );
}

// `expo-router` monta esto en vez de dejar el hueco en blanco cuando una
// pantalla de este árbol revienta al renderizar. Ver `ui/RouteError`.
export { RouteError as ErrorBoundary } from "@/components/ui/RouteError";
