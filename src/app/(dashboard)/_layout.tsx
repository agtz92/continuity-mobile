import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  FolderKanban,
  ListChecks,
  Menu,
  Repeat,
  Sun,
} from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { THEME_SURFACES } from "@/theme/tokens";
import { PALETTE_SWATCHES } from "@/palette/config";
import { DashboardTour } from "@/components/onboarding/DashboardTour";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function DashboardLayout() {
  const { t } = useTranslation();
  const { effective, palette } = useTheme();
  const surfaces = THEME_SURFACES[effective];
  const [accent] = PALETTE_SWATCHES[palette][effective];

  // Push registration + tap-to-navigate (Fase 8). Inert under Expo Go.
  usePushNotifications();

  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,
        // Subtle cross-tab transition (react-navigation v7 bottom tabs).
        animation: "shift",
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: surfaces.textMuted,
        tabBarStyle: {
          backgroundColor: surfaces.surface,
          borderTopColor: surfaces.border,
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: t("tabs.today"),
          tabBarIcon: ({ color, size }) => <Sun color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: t("tabs.projects"),
          tabBarIcon: ({ color, size }) => (
            <FolderKanban color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: t("tabs.tasks"),
          tabBarIcon: ({ color, size }) => (
            <ListChecks color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: t("tabs.routines"),
          tabBarIcon: ({ color, size }) => <Repeat color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="(more)"
        options={{
          title: t("tabs.more"),
          tabBarIcon: ({ color, size }) => <Menu color={color} size={size} />,
        }}
      />
    </Tabs>
    <DashboardTour />
    </>
  );
}
